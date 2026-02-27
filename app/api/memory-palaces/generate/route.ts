import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { MemoryPalace } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { generateMemoryPalaceWithOpenAI } from '@/lib/ai/openai';
import { normalizeMemoryPalaceDocumentV2, normalizePalaceV2 } from '@/lib/memory-palace/v2';
import { generateFromConceptSchema } from '@/lib/utils/validators';
import { codedErrorResponse, rateLimitResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/utils/response';
import { attachRateLimitHeaders, consumeUserRateLimit } from '@/lib/rate-limit';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;
const AI_GENERATION_RATE_LIMIT = {
  routeKey: 'ai:memory-palace',
  maxPerMinute: 10,
  maxPerDay: 100,
} as const;

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const authUser = getUserFromRequest(req);
    if (!authUser) {
      return unauthorizedResponse();
    }

    const body = await req.json().catch(() => ({}));
    const validation = generateFromConceptSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const { conceptTitle, conceptContent } = validation.data;

    const rateLimit = consumeUserRateLimit(authUser.userId, AI_GENERATION_RATE_LIMIT);
    if (!rateLimit.allowed) {
      console.info('[ai.generate]', {
        route: '/api/memory-palaces/generate',
        userId: authUser.userId,
        costType: 'memory-palace',
        result: 'deny',
      });
      const blocked = rateLimitResponse(
        'AI memory palace generation limit exceeded. Please try again later.',
        rateLimit.retryAfterSec
      );
      return attachRateLimitHeaders(blocked, rateLimit.headers);
    }

    console.info('[ai.generate]', {
      route: '/api/memory-palaces/generate',
      userId: authUser.userId,
      costType: 'memory-palace',
      result: 'allow',
    });

    // AI로 기억의 궁전 구조 생성
    let palaceData;
    try {
      palaceData = await generateMemoryPalaceWithOpenAI(conceptTitle, conceptContent);
    } catch (aiError: any) {
      console.error('AI generation error:', aiError);
      if (typeof aiError?.message === 'string' && aiError.message.startsWith('Missing required environment variable:')) {
        return codedErrorResponse('BAD_REQUEST', aiError.message, 400);
      }
      return codedErrorResponse('INTERNAL_ERROR', 'AI 기억의 궁전 생성에 실패했습니다', 500);
    }

    const generatedItems = Array.isArray(palaceData?.items) ? palaceData.items : [];
    const palaceV2 = normalizePalaceV2({
      version: 'v2',
      rooms: [
        {
          id: `room-${Date.now()}`,
          name: `${conceptTitle} 기억실`,
          description: palaceData?.description || `${conceptTitle}에 대한 기억의 궁전`,
          themeColor: '#3b82f6',
          anchors: generatedItems.map((item: any, index: number) => ({
            id: item?.id || `anchor-${index + 1}`,
            content: item?.content || `핵심 포인트 ${index + 1}`,
            image: item?.image,
            position: {
              x: item?.position?.x ?? 50,
              y: item?.position?.y ?? 50,
              z: 0,
            },
            style: {
              shape: item?.shape || 'card',
              size: item?.size || 'medium',
              color: item?.color || '#3b82f6',
            },
          })),
        },
      ],
    });

    // 기억의 궁전 저장 (V2 스키마)
    const memoryPalace = await MemoryPalace.create({
      userId: authUser.userId,
      title: conceptTitle,
      rooms: palaceV2,
    });

    const response = NextResponse.json({
      success: true,
      data: normalizeMemoryPalaceDocumentV2(memoryPalace.toObject()),
    });
    return attachRateLimitHeaders(response, rateLimit.headers);
  } catch (error: any) {
    console.error('Generate memory palace error:', error);
    if (typeof error?.message === 'string' && error.message.startsWith('Missing required environment variable:')) {
      return codedErrorResponse('BAD_REQUEST', error.message, 400);
    }
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to generate memory palace', 500);
  }
}
