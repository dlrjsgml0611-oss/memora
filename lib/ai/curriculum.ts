export interface GeneratedCurriculumTopic {
  topicId: string;
  title: string;
  order: number;
  learningObjectives: string[];
  keyPoints: string[];
  example?: string;
  memoryHint?: string;
  checkpointQuestion?: string;
}

export interface GeneratedCurriculumModule {
  moduleId: string;
  title: string;
  order: number;
  estimatedHours: number;
  moduleSummary?: string;
  moduleObjectives: string[];
  topics: GeneratedCurriculumTopic[];
}

export interface GeneratedCurriculum {
  title: string;
  description: string;
  prerequisites: string[];
  targetOutcomes: string[];
  studyTips: string[];
  recommendedWeeklyHours: number;
  modules: GeneratedCurriculumModule[];
}

function toStringValue(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function toStringArray(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const text = item.trim();
    if (!text) continue;
    if (!result.includes(text)) {
      result.push(text);
    }
    if (result.length >= max) break;
  }
  return result;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const integer = Math.round(numeric);
  return Math.max(min, Math.min(max, integer));
}

function extractJsonObject(text: string): string {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start < 0 || end <= start) {
    throw new Error('No JSON object found in model response');
  }

  return cleaned.slice(start, end + 1);
}

function sanitizeTopic(raw: unknown, moduleOrder: number, topicOrder: number): GeneratedCurriculumTopic | null {
  if (!raw || typeof raw !== 'object') return null;
  const topic = raw as Record<string, unknown>;
  const title = toStringValue(topic.title, `토픽 ${moduleOrder}.${topicOrder}`);
  if (!title) return null;

  const learningObjectives = toStringArray(topic.learningObjectives, 5);
  const keyPoints = toStringArray(topic.keyPoints, 6);

  return {
    topicId: toStringValue(topic.topicId, `topic-${moduleOrder}-${topicOrder}`),
    title,
    order: clampInt(topic.order, 1, 999, topicOrder),
    learningObjectives:
      learningObjectives.length > 0 ? learningObjectives : [`${title}의 핵심 원리를 이해한다.`],
    keyPoints: keyPoints.length > 0 ? keyPoints : [`${title}의 핵심 개념을 정리한다.`],
    example: toStringValue(topic.example, ''),
    memoryHint: toStringValue(topic.memoryHint, ''),
    checkpointQuestion: toStringValue(topic.checkpointQuestion, ''),
  };
}

function sanitizeModule(raw: unknown, moduleOrder: number): GeneratedCurriculumModule | null {
  if (!raw || typeof raw !== 'object') return null;
  const module = raw as Record<string, unknown>;
  const topicsInput = Array.isArray(module.topics) ? module.topics : [];
  const topics = topicsInput
    .map((topic, index) => sanitizeTopic(topic, moduleOrder, index + 1))
    .filter((topic): topic is GeneratedCurriculumTopic => Boolean(topic));

  if (topics.length === 0) {
    return null;
  }

  return {
    moduleId: toStringValue(module.moduleId, `module-${moduleOrder}`),
    title: toStringValue(module.title, `모듈 ${moduleOrder}`),
    order: clampInt(module.order, 1, 999, moduleOrder),
    estimatedHours: clampInt(module.estimatedHours, 1, 120, Math.max(3, topics.length * 2)),
    moduleSummary: toStringValue(module.moduleSummary, ''),
    moduleObjectives: toStringArray(module.moduleObjectives, 6),
    topics,
  };
}

export function buildCurriculumPrompt(goal: string, subject: string, difficulty: string) {
  return `당신은 학습 설계 전문가입니다. 학습자가 "이해-적용-암기"를 모두 달성하도록 고품질 커리큘럼을 설계하세요.

학습 목표: ${goal}
학습 주제: ${subject}
난이도: ${difficulty}

필수 조건:
1) 모듈은 3~5개, 모듈당 토픽은 3~5개로 구성하세요.
2) 각 토픽은 학습목표(learningObjectives), 핵심포인트(keyPoints), 예시(example), 기억 힌트(memoryHint), 셀프체크 질문(checkpointQuestion)을 포함하세요.
3) 과도하게 이론만 나열하지 말고, 실제 학습자가 바로 따라할 수 있도록 작성하세요.
4) 모든 텍스트는 자연스러운 한국어로 작성하세요.
5) 설명은 간결하지만 학습에 필요한 정보는 빠짐없이 포함하세요.

아래 JSON 스키마를 정확히 지켜서 반환하세요. 마크다운/설명 없이 JSON만 반환하세요.
{
  "title": "커리큘럼 제목",
  "description": "커리큘럼 요약 설명",
  "prerequisites": ["사전지식 1", "사전지식 2"],
  "targetOutcomes": ["학습 후 할 수 있는 것 1", "학습 후 할 수 있는 것 2"],
  "studyTips": ["학습 팁 1", "학습 팁 2"],
  "recommendedWeeklyHours": 6,
  "modules": [
    {
      "moduleId": "module-1",
      "title": "모듈 제목",
      "order": 1,
      "estimatedHours": 8,
      "moduleSummary": "모듈 한 줄 요약",
      "moduleObjectives": ["모듈 목표 1", "모듈 목표 2"],
      "topics": [
        {
          "topicId": "topic-1-1",
          "title": "토픽 제목",
          "order": 1,
          "learningObjectives": ["이 토픽에서 달성할 목표 1", "목표 2"],
          "keyPoints": ["핵심 포인트 1", "핵심 포인트 2"],
          "example": "간단한 실제 예시",
          "memoryHint": "암기용 연상 힌트",
          "checkpointQuestion": "학습자가 스스로 답해볼 질문"
        }
      ]
    }
  ]
}`;
}

export function parseCurriculumJsonResponse(responseText: string): GeneratedCurriculum {
  const jsonString = extractJsonObject(responseText);
  const parsed = JSON.parse(jsonString) as Record<string, unknown>;

  const modulesInput = Array.isArray(parsed.modules) ? parsed.modules : [];
  const modules = modulesInput
    .map((module, index) => sanitizeModule(module, index + 1))
    .filter((module): module is GeneratedCurriculumModule => Boolean(module));

  if (modules.length === 0) {
    throw new Error('Invalid curriculum response: no valid modules');
  }

  return {
    title: toStringValue(parsed.title, '맞춤 학습 커리큘럼'),
    description: toStringValue(parsed.description, 'AI가 생성한 학습 로드맵입니다.'),
    prerequisites: toStringArray(parsed.prerequisites, 8),
    targetOutcomes: toStringArray(parsed.targetOutcomes, 8),
    studyTips: toStringArray(parsed.studyTips, 8),
    recommendedWeeklyHours: clampInt(parsed.recommendedWeeklyHours, 1, 40, 6),
    modules,
  };
}
