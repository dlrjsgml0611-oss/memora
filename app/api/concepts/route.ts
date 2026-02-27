import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { Concept, ConceptVisualAsset, Curriculum } from '@/lib/db/models';
import { getUserFromRequest } from '@/lib/auth/middleware';
import { aiRouter } from '@/lib/ai/router';
import { generateConceptImageWithOpenAI } from '@/lib/ai/openai';
import { normalizeCurriculumDocumentV2 } from '@/lib/curriculum/v2';
import {
  buildConceptRenderHints,
  buildVisualItemsFromPrompts,
  fallbackHighlightsFromText,
  generateConceptHighlights,
  generateConceptVisualPrompts,
  type ConceptAIModel,
  type ConceptHighlight,
  type ConceptVisual,
} from '@/lib/ai/concept-enhancement';
import { createConceptSchema } from '@/lib/utils/validators';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  paginatedResponse,
  rateLimitResponse,
  validationErrorResponse,
} from '@/lib/utils/response';
import { attachRateLimitHeaders, consumeUserRateLimit } from '@/lib/rate-limit';

// Increase timeout for AI generation (5 minutes)
export const maxDuration = 300;
const AI_GENERATION_RATE_LIMIT = {
  routeKey: 'ai:concept',
  maxPerMinute: 10,
  maxPerDay: 100,
} as const;

const ENRICH_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const MAX_BACKGROUND_ENRICH_PER_REQUEST = 2;
const MAX_VISUAL_ASSET_BYTES = 5 * 1024 * 1024;
const OPENAI_IMAGE_PROMPT_LIMIT = Math.max(
  1,
  Math.min(2, Number(process.env.OPENAI_IMAGE_PROMPT_LIMIT || '1') || 1)
);
const DEFAULT_IMAGE_RATE_LIMIT_COOLDOWN_MS = 15_000;
const enrichInFlight = new Set<string>();
let openAIImageCooldownUntil = 0;
let lastRateLimitWarnAt = 0;

function normalizeModel(model?: string): ConceptAIModel {
  if (model === 'openai' || model === 'gemini') return model;
  return 'claude';
}

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function extractContent(record: any) {
  return record?.content && typeof record.content === 'object' ? record.content : {};
}

function hasHighlights(record: any) {
  const content = extractContent(record);
  return Array.isArray(content.highlights) && content.highlights.length > 0;
}

function hasVisuals(record: any) {
  const content = extractContent(record);
  return Array.isArray(content.visuals) && content.visuals.length > 0;
}

function canEnrichNow(record: any) {
  const content = extractContent(record);
  const lastEnrichedAt = toDate(content?.renderHints?.lastEnrichedAt);
  if (!lastEnrichedAt) return true;
  return Date.now() - lastEnrichedAt.getTime() > ENRICH_COOLDOWN_MS;
}

function needsEnrichment(record: any) {
  return (!hasHighlights(record) || !hasVisuals(record)) && canEnrichNow(record);
}

function toHighlightPayload(highlights: ConceptHighlight[]) {
  return highlights.map((highlight) => ({
    text: highlight.text,
    weight: highlight.weight,
    reason: highlight.reason,
  }));
}

function toVisualPayload(visuals: ConceptVisual[]) {
  return visuals.map((visual) => ({
    id: visual.id,
    prompt: visual.prompt,
    url: visual.url,
    alt: visual.alt,
    provider: visual.provider,
    generatedAt: new Date(visual.generatedAt),
    cacheKey: visual.cacheKey,
    width: visual.width,
    height: visual.height,
  }));
}

async function getCachedVisualByKey(cacheKey: string): Promise<ConceptVisual | null> {
  const cached = await Concept.findOne({ 'content.visuals.cacheKey': cacheKey })
    .select('content.visuals')
    .lean();

  if (!cached || Array.isArray(cached)) return null;

  const visuals = (cached as any)?.content?.visuals;
  if (!Array.isArray(visuals)) return null;

  const matched = visuals.find((item: any) => item?.cacheKey === cacheKey && typeof item?.url === 'string');
  if (!matched) return null;
  const matchedUrl = String(matched.url || '');

  // 내부 에셋 URL인데 실제 에셋이 없으면 캐시를 무시하고 재생성 경로로 보낸다.
  if (matchedUrl.startsWith('/api/concepts/visuals/')) {
    const hasAsset = await ConceptVisualAsset.exists({ cacheKey });
    if (!hasAsset) return null;
  }

  return {
    id: typeof matched.id === 'string' ? matched.id : `visual-${cacheKey.slice(0, 8)}`,
    prompt: typeof matched.prompt === 'string' ? matched.prompt : '',
    url: matchedUrl,
    alt: typeof matched.alt === 'string' ? matched.alt : '설명 이미지',
    provider: normalizeModel(matched.provider),
    generatedAt: toDate(matched.generatedAt)?.toISOString() || new Date().toISOString(),
    cacheKey,
    width: typeof matched.width === 'number' ? matched.width : undefined,
    height: typeof matched.height === 'number' ? matched.height : undefined,
  };
}

function buildConceptVisualAssetUrl(cacheKey: string) {
  return `/api/concepts/visuals/${cacheKey}`;
}

function decodeBase64Image(base64: string): Buffer {
  const cleaned = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '').trim();
  return Buffer.from(cleaned, 'base64');
}

function isOpenAIImageRateLimitError(error: unknown) {
  const row = error as any;
  return row?.status === 429 || row?.code === 'rate_limit_exceeded';
}

function getOpenAIImageRetryDelayMs(error: unknown) {
  const row = error as any;
  const headers = row?.headers;
  const retryAfterHeader =
    typeof headers?.get === 'function'
      ? headers.get('retry-after') || headers.get('Retry-After')
      : undefined;
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  const message = String(row?.message || '');
  const secondsMatch = message.match(/try again in\s+(\d+)\s*s/i);
  if (secondsMatch) {
    const seconds = Number(secondsMatch[1]);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }

  return DEFAULT_IMAGE_RATE_LIMIT_COOLDOWN_MS;
}

async function resolveVisualByOpenAI(input: {
  cacheKey: string;
  prompt: string;
}) {
  const { cacheKey, prompt } = input;
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  if (Date.now() < openAIImageCooldownUntil) {
    return null;
  }

  const existingAsset = await ConceptVisualAsset.findOne({ cacheKey })
    .select('width height')
    .lean();
  if (existingAsset && !Array.isArray(existingAsset)) {
    return {
      url: buildConceptVisualAssetUrl(cacheKey),
      width: typeof (existingAsset as any).width === 'number' ? (existingAsset as any).width : undefined,
      height: typeof (existingAsset as any).height === 'number' ? (existingAsset as any).height : undefined,
      provider: 'openai' as const,
    };
  }

  try {
    const generated = await generateConceptImageWithOpenAI(prompt);
    const buffer = decodeBase64Image(generated.base64);
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_VISUAL_ASSET_BYTES) {
      return null;
    }

    await ConceptVisualAsset.updateOne(
      { cacheKey },
      {
        $setOnInsert: {
          cacheKey,
          mimeType: generated.mimeType,
          data: buffer,
          width: generated.width,
          height: generated.height,
          provider: 'openai',
        },
      },
      { upsert: true }
    );

    return {
      url: buildConceptVisualAssetUrl(cacheKey),
      width: generated.width,
      height: generated.height,
      provider: 'openai' as const,
    };
  } catch (error) {
    if (isOpenAIImageRateLimitError(error)) {
      const retryDelayMs = getOpenAIImageRetryDelayMs(error);
      openAIImageCooldownUntil = Date.now() + retryDelayMs;

      // 같은 메시지가 과도하게 찍히지 않도록 간격 제한
      if (Date.now() - lastRateLimitWarnAt > 5000) {
        console.warn(`OpenAI image rate limit hit. Cooldown for ${Math.ceil(retryDelayMs / 1000)}s.`);
        lastRateLimitWarnAt = Date.now();
      }
      return null;
    }

    console.error('resolveVisualByOpenAI failed:', error);
    return null;
  }
}

async function buildConceptEnhancement(params: {
  topicTitle: string;
  conceptText: string;
  curriculumContext: string;
  aiModel: ConceptAIModel;
}) {
  const { topicTitle, conceptText, curriculumContext, aiModel } = params;

  const highlightResult = await generateConceptHighlights(
    aiModel,
    topicTitle,
    curriculumContext,
    conceptText
  );

  const safeHighlights =
    highlightResult.highlights.length > 0
      ? highlightResult.highlights
      : fallbackHighlightsFromText(conceptText, 4);

  const visualPromptResult = await generateConceptVisualPrompts(
    aiModel,
    topicTitle,
    curriculumContext,
    conceptText
  );

  const enableOpenAIImage = Boolean(process.env.OPENAI_API_KEY);
  const selectedVisualPrompts = enableOpenAIImage
    ? visualPromptResult.prompts.slice(0, OPENAI_IMAGE_PROMPT_LIMIT)
    : visualPromptResult.prompts;
  const visualProvider: ConceptAIModel = enableOpenAIImage ? 'openai' : aiModel;

  const visuals = await buildVisualItemsFromPrompts({
    prompts: selectedVisualPrompts,
    topicTitle,
    conceptText,
    provider: visualProvider,
    fallbackProvider: aiModel,
    getCachedVisualByKey,
    resolveVisualByKey:
      enableOpenAIImage
        ? async ({ cacheKey, prompt }) => resolveVisualByOpenAI({ cacheKey, prompt })
        : undefined,
  });

  const renderHints = buildConceptRenderHints({
    summary: highlightResult.summary,
    readingLevel: highlightResult.readingLevel,
  });

  return {
    highlights: safeHighlights,
    visuals,
    renderHints,
  };
}

async function enrichConceptById(conceptId: string) {
  if (enrichInFlight.has(conceptId)) return;
  enrichInFlight.add(conceptId);

  try {
    const concept = await Concept.findById(conceptId);
    if (!concept) return;

    const conceptRecord = concept.toObject();
    if (!needsEnrichment(conceptRecord)) return;

    const model = normalizeModel(concept.aiGenerated?.model);
    const conceptText = concept.content?.text || '';
    if (!conceptText.trim()) return;

    const enhancement = await buildConceptEnhancement({
      topicTitle: concept.title,
      conceptText,
      curriculumContext: '',
      aiModel: model,
    });

    const mergedVisuals =
      enhancement.visuals.length > 0
        ? enhancement.visuals
        : (Array.isArray(concept.content?.visuals) ? concept.content.visuals : []);

    concept.content = {
      text: concept.content?.text || '',
      code: concept.content?.code || '',
      references: concept.content?.references || [],
      highlights: toHighlightPayload(enhancement.highlights),
      visuals: toVisualPayload(mergedVisuals as ConceptVisual[]),
      images:
        mergedVisuals.length > 0
          ? mergedVisuals.map((visual: any) => visual.url).filter(Boolean)
          : concept.content?.images || [],
      renderHints: {
        ...(concept.content?.renderHints || {}),
        summary: enhancement.renderHints.summary,
        readingLevel: enhancement.renderHints.readingLevel,
        lastEnrichedAt: new Date(enhancement.renderHints.lastEnrichedAt),
      },
    };

    await concept.save();
  } catch (error) {
    console.error('Background concept enrichment failed:', conceptId, error);
  } finally {
    enrichInFlight.delete(conceptId);
  }
}

function queueBackgroundEnrichment(concepts: any[]) {
  const candidates = concepts
    .filter((concept) => needsEnrichment(concept))
    .slice(0, MAX_BACKGROUND_ENRICH_PER_REQUEST);

  candidates.forEach((concept) => {
    const conceptId = String(concept._id || '');
    if (!conceptId) return;
    void enrichConceptById(conceptId);
  });
}

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

    // Build query scoped to user's curriculum ownership
    const query: any = {};
    const userCurriculums = await Curriculum.find({ userId: authUser.userId }, { _id: 1 });
    const curriculumIds = userCurriculums.map((c: any) => c._id.toString());

    if (curriculumId) {
      if (!curriculumIds.includes(curriculumId)) {
        return forbiddenResponse('You cannot access concepts from this curriculum');
      }
      query.curriculumId = curriculumId;
    } else {
      query.curriculumId = { $in: curriculumIds };
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
      .skip((page - 1) * limit)
      .lean();

    queueBackgroundEnrichment(concepts as any[]);

    return paginatedResponse(concepts as any[], total, page, limit);
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

    const body = await req.json().catch(() => ({}));
    const validation = createConceptSchema.safeParse(body);
    if (!validation.success) {
      return validationErrorResponse(validation.error.issues);
    }
    const {
      curriculumId,
      topicId,
      topicTitle,
      aiModel = 'claude',
      mode = 'conversational',
    } = validation.data;
    const generationMode = mode === 'encyclopedia' ? 'encyclopedia' : 'conversational';

    if (!curriculumId || !topicTitle) {
      return errorResponse('Curriculum ID and topic title are required', 400);
    }

    const curriculum = await Curriculum.findById(curriculumId).select(
      '_id userId title subject difficulty structure structureV2 learningMeta'
    );
    if (!curriculum) {
      return notFoundResponse('Curriculum');
    }
    if (curriculum.userId.toString() !== authUser.userId) {
      return forbiddenResponse('You cannot create concepts in this curriculum');
    }

    const normalizedCurriculum = normalizeCurriculumDocumentV2(curriculum.toObject());
    const moduleWithTopic = normalizedCurriculum.structureV2.find((module) =>
      module.topics.some((topic) =>
        topicId ? topic.topicId === topicId : topic.title === topicTitle
      )
    );
    const topicDetail = moduleWithTopic?.topics.find((topic) =>
      topicId ? topic.topicId === topicId : topic.title === topicTitle
    );

    const contextBlocks = [
      `커리큘럼 제목: ${normalizedCurriculum.title}`,
      `주제: ${normalizedCurriculum.subject}`,
      `난이도: ${normalizedCurriculum.difficulty}`,
      moduleWithTopic ? `모듈: ${moduleWithTopic.title}` : '',
      moduleWithTopic?.moduleSummary ? `모듈 요약: ${moduleWithTopic.moduleSummary}` : '',
      topicDetail?.learningObjectives?.length
        ? `토픽 학습목표: ${topicDetail.learningObjectives.join(', ')}`
        : '',
      topicDetail?.keyPoints?.length
        ? `토픽 핵심포인트: ${topicDetail.keyPoints.join(', ')}`
        : '',
      topicDetail?.example ? `예시: ${topicDetail.example}` : '',
      topicDetail?.memoryHint ? `기억 힌트: ${topicDetail.memoryHint}` : '',
      topicDetail?.checkpointQuestion ? `셀프체크 질문: ${topicDetail.checkpointQuestion}` : '',
    ].filter(Boolean);

    const curriculumContext = contextBlocks.join('\n');

    const rateLimit = consumeUserRateLimit(authUser.userId, AI_GENERATION_RATE_LIMIT);
    if (!rateLimit.allowed) {
      console.info('[ai.generate]', {
        route: '/api/concepts',
        userId: authUser.userId,
        costType: 'concept',
        result: 'deny',
      });
      const blocked = rateLimitResponse(
        'AI concept generation limit exceeded. Please try again later.',
        rateLimit.retryAfterSec
      );
      return attachRateLimitHeaders(blocked, rateLimit.headers);
    }

    console.info('[ai.generate]', {
      route: '/api/concepts',
      userId: authUser.userId,
      costType: 'concept',
      result: 'allow',
    });

    // Generate concept explanation using AI
    let conceptText = '';
    try {
      conceptText = await aiRouter.generateConcept(
        topicTitle,
        curriculumContext || `커리큘럼 주제: ${topicTitle}`,
        aiModel as any,
        generationMode
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

    const normalizedModel = normalizeModel(aiModel);
    const enhancement = await buildConceptEnhancement({
      topicTitle,
      conceptText,
      curriculumContext,
      aiModel: normalizedModel,
    });

    // Regenerate existing concept for same topic if present
    const existingConcept = topicId
      ? await Concept.findOne({ curriculumId, topicId })
      : await Concept.findOne({ curriculumId, title: topicTitle });

    if (existingConcept) {
      const previousVisuals = Array.isArray(existingConcept.content?.visuals)
        ? existingConcept.content.visuals
        : [];

      const mergedVisuals =
        enhancement.visuals.length > 0
          ? enhancement.visuals
          : (previousVisuals as ConceptVisual[]);

      existingConcept.title = topicTitle;
      existingConcept.topicId = topicId || existingConcept.topicId;
      existingConcept.content = {
        text: conceptText,
        code: existingConcept.content?.code || '',
        images:
          mergedVisuals.length > 0
            ? mergedVisuals.map((visual) => visual.url)
            : existingConcept.content?.images || [],
        references: existingConcept.content?.references || [],
        highlights: toHighlightPayload(enhancement.highlights),
        visuals: toVisualPayload(mergedVisuals),
        renderHints: {
          ...(existingConcept.content?.renderHints || {}),
          summary: enhancement.renderHints.summary,
          readingLevel: enhancement.renderHints.readingLevel,
          lastEnrichedAt: new Date(enhancement.renderHints.lastEnrichedAt),
        },
      };
      existingConcept.aiGenerated = {
        model: aiModel,
        prompt: `Topic: ${topicTitle} | Mode: ${generationMode}`,
        generatedAt: new Date(),
      };
      await existingConcept.save();
      const response = successResponse(existingConcept, 'Concept regenerated successfully');
      return attachRateLimitHeaders(response, rateLimit.headers);
    }

    const concept = await Concept.create({
      curriculumId,
      topicId,
      title: topicTitle,
      content: {
        text: conceptText,
        code: '',
        images: enhancement.visuals.map((visual) => visual.url),
        references: [],
        highlights: toHighlightPayload(enhancement.highlights),
        visuals: toVisualPayload(enhancement.visuals),
        renderHints: {
          summary: enhancement.renderHints.summary,
          readingLevel: enhancement.renderHints.readingLevel,
          lastEnrichedAt: new Date(enhancement.renderHints.lastEnrichedAt),
        },
      },
      aiGenerated: {
        model: aiModel,
        prompt: `Topic: ${topicTitle} | Mode: ${generationMode}`,
        generatedAt: new Date(),
      },
      tags: [],
      difficulty: 5,
      relatedConcepts: [],
    });

    const response = successResponse(concept, 'Concept created successfully', 201);
    return attachRateLimitHeaders(response, rateLimit.headers);
  } catch (error: any) {
    console.error('Create concept error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      errors: error.errors,
    });
    if (typeof error?.message === 'string' && error.message.startsWith('Missing required environment variable:')) {
      return errorResponse(error.message, 400);
    }
    return errorResponse(error.message || 'Failed to create concept', 500);
  }
}
