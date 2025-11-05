import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Concept, Curriculum } from '@/lib/db/models';
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

// GET /api/concepts - Get all concepts for the user
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const curriculumId = searchParams.get('curriculumId');

    if (isNaN(page) || page < 1) {
      return errorResponse('Invalid page parameter', 400);
    }

    if (isNaN(limit) || limit < 1 || limit > 100) {
      return errorResponse('Invalid limit parameter (must be 1-100)', 400);
    }

    // Build query
    const query: any = {};

    // Get all curriculum IDs for this user
    const userCurriculums = await Curriculum.find(
      { userId: authUser.userId },
      { _id: 1 }
    );
    const curriculumIds = userCurriculums.map(c => c._id);

    query.curriculumId = { $in: curriculumIds };

    // Filter by specific curriculum if provided
    if (curriculumId) {
      query.curriculumId = curriculumId;
    }

    // Search by title or content
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'content.text': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const total = await Concept.countDocuments(query);
    const concepts = await Concept.find(query)
      .populate('curriculumId', 'title subject')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    return paginatedResponse(concepts, total, page, limit);
  } catch (error) {
    console.error('Get concepts error:', error);
    return errorResponse('Failed to get concepts', 500);
  }
}

// POST /api/concepts - Create a new concept with AI
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { curriculumId, topicTitle, aiModel = 'claude', mode = 'conversational' } = body;

    if (!curriculumId || !topicTitle) {
      return errorResponse('Curriculum ID and topic title are required', 400);
    }

    // Generate concept explanation using AI
    let conceptText = '';
    try {
      conceptText = await aiRouter.generateConcept(
        topicTitle,
        `커리큘럼 주제: ${topicTitle}`,
        aiModel as any,
        mode
      );
    } catch (aiError) {
      console.error('AI generation error:', aiError);
      // Provide default content if AI fails
      conceptText = `${topicTitle}에 대한 개념 설명입니다.\n\nAI 생성에 실패했습니다. 나중에 다시 시도하거나 수동으로 내용을 추가해주세요.`;
    }

    // Ensure conceptText is not empty
    if (!conceptText || conceptText.trim().length === 0) {
      conceptText = `${topicTitle}에 대한 개념 설명입니다.\n\n내용을 추가해주세요.`;
    }

    // Create concept in database
    const concept = await Concept.create({
      curriculumId,
      title: topicTitle,
      content: {
        text: conceptText,
        code: '',
        images: [],
        references: [],
      },
      aiGenerated: {
        model: aiModel,
        prompt: `Topic: ${topicTitle}`,
        generatedAt: new Date(),
      },
      tags: [],
      difficulty: 5,
      relatedConcepts: [],
    });

    return successResponse(concept, 'Concept created successfully', 201);
  } catch (error: any) {
    console.error('Create concept error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
    });
    return errorResponse(error.message || 'Failed to create concept', 500);
  }
}
