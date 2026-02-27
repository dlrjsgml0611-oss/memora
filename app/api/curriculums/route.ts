import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Curriculum } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { aiRouter } from '@/lib/ai/router';
import { normalizeCurriculumDocumentV2, normalizeGeneratedCurriculum } from '@/lib/curriculum/v2';
import { createCurriculumSchema } from '@/lib/utils/validators';
import {
  codedErrorResponse,
  createdResponse,
  errorResponse,
  paginatedResponse,
  rateLimitResponse,
  unauthorizedResponse,
  validationErrorResponse,
} from '@/lib/utils/response';
import { attachRateLimitHeaders, consumeUserRateLimit } from '@/lib/rate-limit';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;
const AI_GENERATION_RATE_LIMIT = {
  routeKey: 'ai:curriculum',
  maxPerMinute: 10,
  maxPerDay: 100,
} as const;

// GET /api/curriculums - Get all curriculums for the user
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (isNaN(page) || page < 1) {
      return errorResponse('Invalid page parameter', 400);
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse('Invalid limit parameter (must be 1-100)', 400);
    }

    const total = await Curriculum.countDocuments({ userId: authUser.userId });
    const curriculums = await Curriculum.find({ userId: authUser.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    const normalized = curriculums.map((curriculum) => normalizeCurriculumDocumentV2(curriculum));
    return paginatedResponse(normalized, total, page, limit);
  } catch (error) {
    console.error('Get curriculums error:', error);
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to get curriculums', 500);
  }
}

// POST /api/curriculums - Create a new curriculum using AI
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const validation = createCurriculumSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }

    const {
      goal,
      subject,
      difficulty = 'beginner',
      aiModel = 'openai',
    } = validation.data;

    const rateLimit = consumeUserRateLimit(authUser.userId, AI_GENERATION_RATE_LIMIT);
    if (!rateLimit.allowed) {
      console.info('[ai.generate]', {
        route: '/api/curriculums',
        userId: authUser.userId,
        costType: 'curriculum',
        result: 'deny',
      });
      const blocked = rateLimitResponse(
        'AI curriculum generation limit exceeded. Please try again later.',
        rateLimit.retryAfterSec
      );
      return attachRateLimitHeaders(blocked, rateLimit.headers);
    }

    console.info('[ai.generate]', {
      route: '/api/curriculums',
      userId: authUser.userId,
      costType: 'curriculum',
      result: 'allow',
    });

    const generated = await aiRouter.generateCurriculum(goal, subject, difficulty, aiModel);
    const normalized = normalizeGeneratedCurriculum(generated);

    const curriculum = await Curriculum.create({
      userId: authUser.userId,
      title: normalized.title,
      description: normalized.description,
      subject,
      difficulty,
      aiModel,
      schemaVersion: normalized.schemaVersion,
      structure: normalized.structure,
      structureV2: normalized.structureV2,
      learningMeta: normalized.learningMeta,
      quality: normalized.quality,
      progress: {
        completedTopics: [],
        currentModule: normalized.structure[0]?.moduleId || '',
        overallPercentage: 0,
      },
    });

    const response = createdResponse(
      normalizeCurriculumDocumentV2(curriculum.toObject()),
      'Curriculum created successfully'
    );
    return attachRateLimitHeaders(response, rateLimit.headers);
  } catch (error: any) {
    console.error('Create curriculum error:', error);
    const message = typeof error?.message === 'string' ? error.message : 'Failed to create curriculum';
    if (message.startsWith('Missing required environment variable:')) {
      return codedErrorResponse('BAD_REQUEST', message, 400);
    }
    return codedErrorResponse('INTERNAL_ERROR', message, 500);
  }
}
