import { createHash } from 'node:crypto';
import { generateWithOpenAI } from './openai';
import { generateWithClaude } from './claude';
import { generateWithGemini } from './gemini';

export type ConceptAIModel = 'openai' | 'claude' | 'gemini';

export interface ConceptHighlight {
  text: string;
  weight: 1 | 2 | 3;
  reason?: string;
}

export interface ConceptVisual {
  id: string;
  prompt: string;
  url: string;
  alt: string;
  provider: ConceptAIModel;
  generatedAt: string;
  cacheKey: string;
  width?: number;
  height?: number;
}

export interface ConceptRenderHints {
  summary?: string;
  readingLevel?: 'easy' | 'normal' | 'dense';
  lastEnrichedAt: string;
}

interface VisualResolutionInput {
  cacheKey: string;
  prompt: string;
  alt: string;
  provider: ConceptAIModel;
}

interface VisualResolutionResult {
  url: string;
  width?: number;
  height?: number;
  provider?: ConceptAIModel;
}

interface HighlightGenerationResult {
  highlights: ConceptHighlight[];
  summary?: string;
  readingLevel?: 'easy' | 'normal' | 'dense';
}

interface VisualPromptGenerationResult {
  prompts: Array<{ prompt: string; alt: string }>;
}

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, ' ').trim();
}

function ensureKoreanSentence(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractJsonObject(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('No JSON object found in AI response');
  }

  return cleaned.slice(start, end + 1);
}

function parseJsonObject(raw: string): Record<string, unknown> {
  return JSON.parse(extractJsonObject(raw)) as Record<string, unknown>;
}

function runPromptByModel(model: ConceptAIModel, prompt: string) {
  if (model === 'openai') {
    return generateWithOpenAI(prompt, { temperature: 0.4, maxTokens: 3000 });
  }
  if (model === 'gemini') {
    return generateWithGemini(prompt, { temperature: 0.4, maxTokens: 3000 });
  }
  return generateWithClaude(prompt, { temperature: 0.4, maxTokens: 3000 });
}

function sentenceCandidates(text: string) {
  return text
    .split(/(?<=[.!?。？！\n])\s+/)
    .map((sentence) => ensureKoreanSentence(sentence))
    .filter((sentence) => sentence.length >= 18 && sentence.length <= 180);
}

export function fallbackHighlightsFromText(text: string, max = 4): ConceptHighlight[] {
  const candidates = sentenceCandidates(text);
  if (candidates.length === 0) {
    const normalized = ensureKoreanSentence(text).slice(0, 120);
    if (!normalized) return [];
    return [{ text: normalized, weight: 2, reason: '핵심 문장' }];
  }

  const picked = candidates.slice(0, Math.max(1, Math.min(max, 5)));
  return picked.map((sentence, index) => ({
    text: sentence,
    weight: index === 0 ? 3 : 2,
    reason: index === 0 ? '핵심 개념' : '보조 핵심',
  }));
}

function sanitizeHighlights(raw: unknown, contentText: string): ConceptHighlight[] {
  if (!Array.isArray(raw)) return [];

  const normalizedText = normalizeWhitespace(contentText);
  const used = new Set<string>();
  const result: ConceptHighlight[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const text = typeof row.text === 'string' ? ensureKoreanSentence(row.text) : '';
    if (!text || text.length < 6) continue;

    // 원문에 없는 문장은 제외해 허위 하이라이트를 방지
    if (!normalizedText.includes(normalizeWhitespace(text))) continue;

    if (used.has(text)) continue;
    used.add(text);

    const weightRaw = Number(row.weight);
    const weight: 1 | 2 | 3 = weightRaw >= 3 ? 3 : weightRaw <= 1 ? 1 : 2;
    const reason = typeof row.reason === 'string' ? ensureKoreanSentence(row.reason).slice(0, 120) : undefined;
    result.push({ text, weight, reason });

    if (result.length >= 5) break;
  }

  return result;
}

export async function generateConceptHighlights(
  model: ConceptAIModel,
  topicTitle: string,
  contextText: string,
  conceptText: string
): Promise<HighlightGenerationResult> {
  const prompt = `당신은 학습 콘텐츠 편집자입니다. 아래 개념 설명에서 학습자가 반드시 기억해야 할 핵심 문장을 추출하세요.

주제: ${topicTitle}
맥락:\n${contextText || '없음'}
개념 본문:\n${conceptText}

요구사항:
1) 본문에 실제로 존재하는 문장만 선택하세요.
2) 3~5개 문장만 추출하세요.
3) 가장 중요한 문장은 weight=3, 나머지는 1~2로 부여하세요.
4) 읽기 밀도(readingLevel)는 easy|normal|dense 중 하나로 선택하세요.
5) 학습자에게 보여줄 1문장 요약(summary)을 한국어로 작성하세요.
6) JSON만 반환하세요.

반환 형식:
{
  "summary": "한 줄 요약",
  "readingLevel": "easy",
  "highlights": [
    { "text": "핵심 문장", "weight": 3, "reason": "핵심 개념" }
  ]
}`;

  try {
    const raw = await runPromptByModel(model, prompt);
    const parsed = parseJsonObject(raw);
    const highlights = sanitizeHighlights(parsed.highlights, conceptText);

    const summary = typeof parsed.summary === 'string'
      ? ensureKoreanSentence(parsed.summary).slice(0, 260)
      : undefined;

    const readingLevel = parsed.readingLevel === 'easy' || parsed.readingLevel === 'dense'
      ? parsed.readingLevel
      : 'normal';

    if (highlights.length === 0) {
      return {
        highlights: fallbackHighlightsFromText(conceptText, 4),
        summary,
        readingLevel,
      };
    }

    return {
      highlights,
      summary,
      readingLevel,
    };
  } catch (error) {
    console.error('generateConceptHighlights failed:', error);
    return {
      highlights: fallbackHighlightsFromText(conceptText, 4),
      readingLevel: 'normal',
    };
  }
}

function sanitizeVisualPrompts(raw: unknown, topicTitle: string): Array<{ prompt: string; alt: string }> {
  if (!Array.isArray(raw)) return [];
  const results: Array<{ prompt: string; alt: string }> = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;

    const promptEn =
      typeof row.promptEn === 'string'
        ? row.promptEn.trim()
        : typeof row.prompt_en === 'string'
          ? String(row.prompt_en).trim()
          : typeof row.promptEnglish === 'string'
            ? String(row.promptEnglish).trim()
            : '';
    const promptRaw = promptEn || (typeof row.prompt === 'string' ? row.prompt.trim() : '');
    const prompt = normalizeWhitespace(promptRaw)
      .replace(/^["'`]+/, '')
      .replace(/["'`]+$/, '');
    const alt = typeof row.alt === 'string' ? row.alt.trim() : '';
    if (!prompt) continue;

    results.push({
      prompt: prompt.slice(0, 900),
      alt: (alt || `${topicTitle} 설명 이미지`).slice(0, 220),
    });

    if (results.length >= 2) break;
  }

  return results;
}

export async function generateConceptVisualPrompts(
  model: ConceptAIModel,
  topicTitle: string,
  contextText: string,
  conceptText: string
): Promise<VisualPromptGenerationResult> {
  const prompt = `You are an instructional infographic prompt writer.
Generate image prompts for concept learning visuals.

Topic: ${topicTitle}
Context:
${contextText || 'none'}
Concept text:
${conceptText}

Requirements:
1) Create 1-2 educational visual prompts in English only.
2) Do not use Korean or any non-English script in prompt text.
3) Keep prompts concrete: include structure, flow, comparison, labels, camera style, and learning focus.
4) Avoid violence, explicit content, trademarked characters, and logos.
5) Return JSON only.

Output format:
{
  "visualPrompts": [
    {
      "promptEn": "English image generation prompt",
      "alt": "Korean alt text for learners"
    }
  ]
}`;

  try {
    const raw = await runPromptByModel(model, prompt);
    const parsed = parseJsonObject(raw);
    const prompts = sanitizeVisualPrompts(parsed.visualPrompts, topicTitle);
    return { prompts };
  } catch (error) {
    console.error('generateConceptVisualPrompts failed:', error);
    return { prompts: [] };
  }
}

export function createConceptVisualCacheKey(
  topicTitle: string,
  conceptText: string,
  prompt: string,
  provider: ConceptAIModel
) {
  return createHash('sha256')
    .update(`${topicTitle}\n${normalizeWhitespace(conceptText).slice(0, 1200)}\n${normalizeWhitespace(prompt)}\n${provider}\nv1`)
    .digest('hex');
}

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt/';
const POLLINATIONS_QUERY = '&width=1024&height=1024&nologo=true&model=flux';
const MAX_VISUAL_URL_LENGTH = 3900; // DB max(4000) safety margin

function fitPromptForPollinationsUrl(prompt: string, maxEncodedLength: number) {
  const normalized = normalizeWhitespace(prompt) || 'educational concept infographic';
  if (encodeURIComponent(normalized).length <= maxEncodedLength) {
    return normalized;
  }

  let left = 1;
  let right = normalized.length;
  let best = normalized.slice(0, 60);

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const candidate = normalized.slice(0, mid).trim();
    const encodedLength = encodeURIComponent(candidate).length;

    if (encodedLength <= maxEncodedLength && candidate.length > 0) {
      best = candidate;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return best;
}

export function buildConceptVisualUrl(prompt: string, cacheKey: string) {
  const seed = parseInt(cacheKey.slice(0, 8), 16);
  const seedQuery = `?seed=${seed}${POLLINATIONS_QUERY}`;
  const maxEncodedLength = Math.max(120, MAX_VISUAL_URL_LENGTH - POLLINATIONS_BASE.length - seedQuery.length);

  const promptForUrl = fitPromptForPollinationsUrl(prompt, maxEncodedLength);
  const encodedPrompt = encodeURIComponent(promptForUrl);
  const url = `${POLLINATIONS_BASE}${encodedPrompt}${seedQuery}`;

  return { url, promptForUrl };
}

export async function buildVisualItemsFromPrompts(input: {
  prompts: Array<{ prompt: string; alt: string }>;
  topicTitle: string;
  conceptText: string;
  provider: ConceptAIModel;
  fallbackProvider?: ConceptAIModel;
  getCachedVisualByKey: (cacheKey: string) => Promise<ConceptVisual | null>;
  resolveVisualByKey?: (input: VisualResolutionInput) => Promise<VisualResolutionResult | null>;
}) {
  const {
    prompts,
    topicTitle,
    conceptText,
    provider,
    fallbackProvider,
    getCachedVisualByKey,
    resolveVisualByKey,
  } = input;

  const visuals: ConceptVisual[] = [];

  for (let index = 0; index < prompts.length; index += 1) {
    const { prompt, alt } = prompts[index];
    const promptForCache = fitPromptForPollinationsUrl(prompt, 2000);
    const cacheKey = createConceptVisualCacheKey(topicTitle, conceptText, promptForCache, provider);
    const cached = await getCachedVisualByKey(cacheKey);

    if (cached) {
      visuals.push(cached);
      continue;
    }

    if (resolveVisualByKey) {
      try {
        const resolved = await resolveVisualByKey({
          cacheKey,
          prompt: promptForCache,
          alt,
          provider,
        });

        if (resolved?.url) {
          visuals.push({
            id: `visual-${index + 1}-${cacheKey.slice(0, 8)}`,
            prompt: promptForCache,
            url: resolved.url,
            alt,
            provider: resolved.provider || provider,
            generatedAt: new Date().toISOString(),
            cacheKey,
            width: resolved.width,
            height: resolved.height,
          });
          continue;
        }
      } catch (error) {
        console.error('resolveVisualByKey failed:', error);
      }
    }

    const { url, promptForUrl } = buildConceptVisualUrl(promptForCache, cacheKey);
    visuals.push({
      id: `visual-${index + 1}-${cacheKey.slice(0, 8)}`,
      prompt: promptForUrl,
      url,
      alt,
      provider: fallbackProvider || provider,
      generatedAt: new Date().toISOString(),
      cacheKey,
      width: 1024,
      height: 1024,
    });
  }

  return visuals;
}

export function buildConceptRenderHints(input: {
  summary?: string;
  readingLevel?: 'easy' | 'normal' | 'dense';
}): ConceptRenderHints {
  return {
    summary: input.summary,
    readingLevel: input.readingLevel || 'normal',
    lastEnrichedAt: new Date().toISOString(),
  };
}
