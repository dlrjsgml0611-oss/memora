import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Mindmap } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { generateMindmapWithOpenAI } from '@/lib/ai/openai';
import { hierarchyToMindmapV2, normalizeMindmapDocumentV2 } from '@/lib/mindmap/v2';
import { generateFromConceptSchema } from '@/lib/utils/validators';
import { codedErrorResponse, rateLimitResponse, unauthorizedResponse, validationErrorResponse } from '@/lib/utils/response';
import { attachRateLimitHeaders, consumeUserRateLimit } from '@/lib/rate-limit';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;
const AI_GENERATION_RATE_LIMIT = {
  routeKey: 'ai:mindmap',
  maxPerMinute: 10,
  maxPerDay: 100,
} as const;

interface MindmapNode {
  id: string;
  label: string;
  type: string;
  color?: string;
  image?: string;
}

interface MindmapConnection {
  from: string;
  to: string;
  label?: string;
}

interface HierarchicalNode {
  id: string;
  name: string;
  image?: string;
  children?: HierarchicalNode[];
}

// nodes와 connections를 계층 구조로 변환하는 함수
function convertToHierarchicalStructure(
  nodes: MindmapNode[],
  connections: MindmapConnection[]
): HierarchicalNode {
  // 중심 노드 찾기 (type이 'central'인 노드)
  const centralNode = nodes.find(n => n.type === 'central');
  if (!centralNode) {
    throw new Error('Central node not found in mindmap structure');
  }

  // 노드 ID를 키로 하는 맵 생성
  const nodeMap = new Map<string, HierarchicalNode>();
  nodes.forEach(node => {
    nodeMap.set(node.id, {
      id: node.id,
      name: node.label,
      image: node.image,
      children: []
    });
  });

  // 연결 정보를 기반으로 부모-자식 관계 구성
  connections.forEach(conn => {
    const parent = nodeMap.get(conn.from);
    const child = nodeMap.get(conn.to);
    if (parent && child) {
      if (!parent.children) {
        parent.children = [];
      }
      parent.children.push(child);
    }
  });

  // 중심 노드를 루트로 반환
  const root = nodeMap.get(centralNode.id);
  if (!root) {
    throw new Error('Failed to build hierarchical structure');
  }

  return root;
}

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
        route: '/api/mindmaps/generate',
        userId: authUser.userId,
        costType: 'mindmap',
        result: 'deny',
      });
      const blocked = rateLimitResponse(
        'AI mindmap generation limit exceeded. Please try again later.',
        rateLimit.retryAfterSec
      );
      return attachRateLimitHeaders(blocked, rateLimit.headers);
    }

    console.info('[ai.generate]', {
      route: '/api/mindmaps/generate',
      userId: authUser.userId,
      costType: 'mindmap',
      result: 'allow',
    });

    // AI로 마인드맵 구조 생성
    let mindmapData;
    try {
      mindmapData = await generateMindmapWithOpenAI(conceptTitle, conceptContent);
    } catch (aiError: any) {
      console.error('AI generation error:', aiError);
      if (typeof aiError?.message === 'string' && aiError.message.startsWith('Missing required environment variable:')) {
        return codedErrorResponse('BAD_REQUEST', aiError.message, 400);
      }
      return codedErrorResponse('INTERNAL_ERROR', 'AI 마인드맵 생성에 실패했습니다', 500);
    }

    // nodes와 connections를 계층 구조로 변환
    const hierarchicalStructure = convertToHierarchicalStructure(
      mindmapData.nodes,
      mindmapData.connections
    );

    const mindmapV2 = hierarchyToMindmapV2(hierarchicalStructure);

    // 마인드맵 저장 (V2 스키마)
    const mindmap = await Mindmap.create({
      userId: authUser.userId,
      title: conceptTitle,
      structure: mindmapV2,
    });

    const response = NextResponse.json({
      success: true,
      data: normalizeMindmapDocumentV2(mindmap.toObject()),
    });
    return attachRateLimitHeaders(response, rateLimit.headers);
  } catch (error: any) {
    console.error('Generate mindmap error:', error);
    if (typeof error?.message === 'string' && error.message.startsWith('Missing required environment variable:')) {
      return codedErrorResponse('BAD_REQUEST', error.message, 400);
    }
    return codedErrorResponse('INTERNAL_ERROR', 'Failed to generate mindmap', 500);
  }
}
