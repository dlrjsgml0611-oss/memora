import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Curriculum } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { aiRouter } from '@/lib/ai/router';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  paginatedResponse,
} from '@/lib/utils/response';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;

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
      .skip((page - 1) * limit);

    return paginatedResponse(curriculums, total, page, limit);
  } catch (error) {
    console.error('Get curriculums error:', error);
    return errorResponse('Failed to get curriculums', 500);
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

    const body = await req.json();
    const { goal, subject, difficulty = 'beginner', aiModel = 'openai' } = body;

    if (!goal || !subject) {
      return errorResponse('Goal and subject are required', 400);
    }

    // Generate curriculum using AI
    const curriculumData = await aiRouter.generateCurriculum(
      goal,
      subject,
      difficulty,
      aiModel as any
    );

    // Create curriculum in database
    const curriculum = await Curriculum.create({
      userId: authUser.userId,
      title: curriculumData.title,
      description: curriculumData.description,
      subject,
      difficulty,
      aiModel,
      structure: curriculumData.modules.map((module: any) => ({
        moduleId: module.moduleId,
        title: module.title,
        order: module.order,
        estimatedHours: module.estimatedHours || 0,
        topics: module.topics.map((topic: any) => ({
          topicId: topic.topicId,
          title: topic.title,
          order: topic.order,
          conceptIds: [],
        })),
      })),
      progress: {
        completedTopics: [],
        currentModule: '',
        overallPercentage: 0,
      },
    });

    return successResponse(curriculum, 'Curriculum created successfully', 201);
  } catch (error) {
    console.error('Create curriculum error:', error);
    return errorResponse('Failed to create curriculum', 500);
  }
}
