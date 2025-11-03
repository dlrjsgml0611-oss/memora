import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Concept } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { aiRouter } from '@/lib/ai/router';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from '@/lib/utils/response';

// POST /api/concepts - Create a new concept with AI
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json();
    const { curriculumId, topicTitle, aiModel = 'claude' } = body;

    if (!curriculumId || !topicTitle) {
      return errorResponse('Curriculum ID and topic title are required', 400);
    }

    // Generate concept explanation using AI
    let conceptText = '';
    try {
      conceptText = await aiRouter.generateConcept(
        topicTitle,
        `커리큘럼 주제: ${topicTitle}`,
        aiModel as any
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
