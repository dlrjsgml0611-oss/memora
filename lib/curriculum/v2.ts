import type {
  CurriculumDocumentV2,
  CurriculumLegacyModule,
  CurriculumLearningMetaV2,
  CurriculumModuleV2,
  CurriculumQualityV2,
  CurriculumTopicV2,
} from '@/types';

interface CurriculumGenerationInput {
  title?: string;
  description?: string;
  prerequisites?: unknown;
  targetOutcomes?: unknown;
  studyTips?: unknown;
  recommendedWeeklyHours?: unknown;
  modules?: unknown;
}

function toStringValue(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  return fallback;
}

function toStringArray(value: unknown, max: number) {
  if (!Array.isArray(value)) return [] as string[];
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const text = entry.trim();
    if (!text || items.includes(text)) continue;
    items.push(text);
    if (items.length >= max) break;
  }
  return items;
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const rounded = Math.round(numeric);
  return Math.max(min, Math.min(max, rounded));
}

function normalizeTopic(raw: unknown, moduleIndex: number, topicIndex: number): CurriculumTopicV2 | null {
  if (!raw || typeof raw !== 'object') return null;
  const topic = raw as Record<string, unknown>;

  const title = toStringValue(topic.title, `토픽 ${moduleIndex}.${topicIndex}`);
  if (!title) return null;

  const learningObjectives = toStringArray(topic.learningObjectives, 6);
  const keyPoints = toStringArray(topic.keyPoints, 8);

  const normalized: CurriculumTopicV2 = {
    topicId: toStringValue(topic.topicId, `topic-${moduleIndex}-${topicIndex}`),
    title,
    order: clampInt(topic.order, 1, 999, topicIndex),
    learningObjectives:
      learningObjectives.length > 0 ? learningObjectives : [`${title}의 학습 목표를 한 문장으로 정리한다.`],
    keyPoints: keyPoints.length > 0 ? keyPoints : [`${title}의 핵심 개념을 이해한다.`],
  };

  const example = toStringValue(topic.example, '');
  if (example) normalized.example = example;

  const memoryHint = toStringValue(topic.memoryHint, '');
  if (memoryHint) normalized.memoryHint = memoryHint;

  const checkpointQuestion = toStringValue(topic.checkpointQuestion, '');
  if (checkpointQuestion) normalized.checkpointQuestion = checkpointQuestion;

  return normalized;
}

function normalizeModule(raw: unknown, moduleIndex: number): CurriculumModuleV2 | null {
  if (!raw || typeof raw !== 'object') return null;
  const module = raw as Record<string, unknown>;

  const topicsInput = Array.isArray(module.topics) ? module.topics : [];
  const topics = topicsInput
    .map((topic, topicIndex) => normalizeTopic(topic, moduleIndex, topicIndex + 1))
    .filter((topic): topic is CurriculumTopicV2 => Boolean(topic));

  if (topics.length === 0) return null;

  const moduleObjectives = toStringArray(module.moduleObjectives, 6);
  const fallbackObjective = `${toStringValue(module.title, `모듈 ${moduleIndex}`)}의 핵심 흐름을 이해한다.`;

  const normalized: CurriculumModuleV2 = {
    moduleId: toStringValue(module.moduleId, `module-${moduleIndex}`),
    title: toStringValue(module.title, `모듈 ${moduleIndex}`),
    order: clampInt(module.order, 1, 999, moduleIndex),
    estimatedHours: clampInt(module.estimatedHours, 1, 120, Math.max(3, topics.length * 2)),
    moduleObjectives: moduleObjectives.length > 0 ? moduleObjectives : [fallbackObjective],
    topics,
  };

  const moduleSummary = toStringValue(module.moduleSummary, '');
  if (moduleSummary) {
    normalized.moduleSummary = moduleSummary;
  }

  return normalized;
}

export function curriculumV2ToLegacyStructure(structureV2: CurriculumModuleV2[]): CurriculumLegacyModule[] {
  return structureV2.map((module) => ({
    moduleId: module.moduleId,
    title: module.title,
    order: module.order,
    estimatedHours: module.estimatedHours,
    topics: module.topics.map((topic) => ({
      topicId: topic.topicId,
      title: topic.title,
      order: topic.order,
      conceptIds: [],
    })),
  }));
}

export function legacyStructureToCurriculumV2(input: unknown): CurriculumModuleV2[] {
  if (!Array.isArray(input)) return [];

  const modules: CurriculumModuleV2[] = [];
  input.forEach((moduleRaw, moduleIndex) => {
    if (!moduleRaw || typeof moduleRaw !== 'object') return;
    const module = moduleRaw as Record<string, unknown>;
    const topicsRaw = Array.isArray(module.topics) ? module.topics : [];

    const topics: CurriculumTopicV2[] = topicsRaw
      .map((topicRaw, topicIndex) => {
        if (!topicRaw || typeof topicRaw !== 'object') return null;
        const topic = topicRaw as Record<string, unknown>;
        const title = toStringValue(topic.title, `토픽 ${moduleIndex + 1}.${topicIndex + 1}`);
        const objective = `${title}의 핵심 개념을 설명할 수 있다.`;
        return {
          topicId: toStringValue(topic.topicId, `topic-${moduleIndex + 1}-${topicIndex + 1}`),
          title,
          order: clampInt(topic.order, 1, 999, topicIndex + 1),
          learningObjectives: [objective],
          keyPoints: [title],
        } as CurriculumTopicV2;
      })
      .filter((topic): topic is CurriculumTopicV2 => Boolean(topic));

    if (topics.length === 0) return;

    modules.push({
      moduleId: toStringValue(module.moduleId, `module-${moduleIndex + 1}`),
      title: toStringValue(module.title, `모듈 ${moduleIndex + 1}`),
      order: clampInt(module.order, 1, 999, moduleIndex + 1),
      estimatedHours: clampInt(module.estimatedHours, 1, 120, Math.max(3, topics.length * 2)),
      moduleSummary: `${toStringValue(module.title, `모듈 ${moduleIndex + 1}`)} 학습 요약`,
      moduleObjectives: [`${toStringValue(module.title, `모듈 ${moduleIndex + 1}`)}의 핵심 흐름을 이해한다.`],
      topics,
    });
  });

  return modules;
}

function normalizeLearningMeta(input: CurriculumGenerationInput): CurriculumLearningMetaV2 {
  const prerequisites = toStringArray(input.prerequisites, 8);
  const targetOutcomes = toStringArray(input.targetOutcomes, 8);
  const studyTips = toStringArray(input.studyTips, 8);

  return {
    prerequisites,
    targetOutcomes,
    studyTips,
    recommendedWeeklyHours: clampInt(input.recommendedWeeklyHours, 1, 40, 6),
  };
}

function computeQuality(structureV2: CurriculumModuleV2[], learningMeta: CurriculumLearningMetaV2): CurriculumQualityV2 {
  const topics = structureV2.flatMap((module) => module.topics);
  const totalTopics = topics.length || 1;

  const objectivesCoverage = topics.filter((topic) => topic.learningObjectives.length > 0).length / totalTopics;
  const keyPointsCoverage = topics.filter((topic) => topic.keyPoints.length >= 2).length / totalTopics;
  const memoryCoverage =
    topics.filter((topic) => Boolean(topic.memoryHint) && Boolean(topic.checkpointQuestion)).length / totalTopics;

  const metaCoverage =
    [learningMeta.prerequisites.length, learningMeta.targetOutcomes.length, learningMeta.studyTips.length].filter(
      (count) => count > 0
    ).length / 3;

  const readability = Math.round(58 + keyPointsCoverage * 22 + objectivesCoverage * 20);
  const completeness = Math.round(42 + objectivesCoverage * 32 + keyPointsCoverage * 14 + metaCoverage * 12);
  const memorability = Math.round(35 + memoryCoverage * 45 + learningMeta.studyTips.length * 2);
  const score = Math.max(0, Math.min(100, Math.round((readability + completeness + memorability) / 3)));

  const strengths: string[] = [];
  const warnings: string[] = [];

  if (objectivesCoverage >= 0.85) {
    strengths.push('대부분 토픽에 학습 목표가 명확하게 포함되어 있습니다.');
  } else {
    warnings.push('일부 토픽의 학습 목표가 부족합니다. 생성 후 보강을 권장합니다.');
  }

  if (keyPointsCoverage >= 0.7) {
    strengths.push('핵심 포인트가 충분히 구조화되어 가독성이 좋습니다.');
  } else {
    warnings.push('핵심 포인트가 짧거나 부족한 토픽이 있습니다.');
  }

  if (memoryCoverage >= 0.5) {
    strengths.push('기억 힌트/셀프 체크가 포함되어 암기 전환에 유리합니다.');
  } else {
    warnings.push('기억 힌트 또는 셀프 체크 질문이 적어 암기 효율이 떨어질 수 있습니다.');
  }

  if (learningMeta.targetOutcomes.length === 0) {
    warnings.push('학습 완료 기준(target outcomes)이 비어 있습니다.');
  }

  if (strengths.length === 0) {
    strengths.push('커리큘럼 구조는 생성되었으며 학습 순서 기반으로 진행 가능합니다.');
  }

  return {
    score,
    readability: Math.max(0, Math.min(100, readability)),
    completeness: Math.max(0, Math.min(100, completeness)),
    memorability: Math.max(0, Math.min(100, memorability)),
    strengths,
    warnings,
  };
}

export function normalizeGeneratedCurriculum(input: CurriculumGenerationInput) {
  const modulesInput = Array.isArray(input.modules) ? input.modules : [];
  const structureV2 = modulesInput
    .map((module, index) => normalizeModule(module, index + 1))
    .filter((module): module is CurriculumModuleV2 => Boolean(module));

  if (structureV2.length === 0) {
    throw new Error('Generated curriculum has no valid modules');
  }

  const learningMeta = normalizeLearningMeta(input);
  const quality = computeQuality(structureV2, learningMeta);

  return {
    schemaVersion: 'v2' as const,
    title: toStringValue(input.title, '맞춤 학습 커리큘럼'),
    description: toStringValue(input.description, 'AI가 설계한 맞춤 커리큘럼입니다.'),
    structureV2,
    structure: curriculumV2ToLegacyStructure(structureV2),
    learningMeta,
    quality,
  };
}

function normalizeProgress(source: { progress?: unknown; structureV2: CurriculumModuleV2[] }) {
  const progressRaw = source.progress && typeof source.progress === 'object'
    ? (source.progress as Record<string, unknown>)
    : {};

  const completedTopics = toStringArray(progressRaw.completedTopics, 10000);
  const overallPercentage = clampInt(progressRaw.overallPercentage, 0, 100, 0);
  const currentModule = toStringValue(progressRaw.currentModule, '');

  return {
    completedTopics,
    currentModule,
    overallPercentage,
  };
}

export function getCurriculumTopicIds(source: { structure?: unknown; structureV2?: unknown }) {
  const structureV2 = normalizeCurriculumStructureV2(source);
  return structureV2.flatMap((module) => module.topics.map((topic) => topic.topicId));
}

export function normalizeCurriculumStructureV2(source: { structure?: unknown; structureV2?: unknown }) {
  if (Array.isArray(source.structureV2) && source.structureV2.length > 0) {
    const normalized = source.structureV2
      .map((module, index) => normalizeModule(module, index + 1))
      .filter((module): module is CurriculumModuleV2 => Boolean(module));
    if (normalized.length > 0) return normalized;
  }

  return legacyStructureToCurriculumV2(source.structure);
}

export function normalizeCurriculumDocumentV2<
  T extends {
    _id?: unknown;
    title?: unknown;
    description?: unknown;
    subject?: unknown;
    difficulty?: unknown;
    aiModel?: unknown;
    structure?: unknown;
    structureV2?: unknown;
    learningMeta?: unknown;
    quality?: unknown;
    progress?: unknown;
    createdAt?: unknown;
    updatedAt?: unknown;
  }
>(source: T): CurriculumDocumentV2 {
  const structureV2 = normalizeCurriculumStructureV2(source);
  const structure = curriculumV2ToLegacyStructure(structureV2);

  const learningMetaInput =
    source.learningMeta && typeof source.learningMeta === 'object'
      ? (source.learningMeta as CurriculumGenerationInput)
      : {};

  const learningMeta = normalizeLearningMeta(learningMetaInput);

  const qualityRaw = source.quality && typeof source.quality === 'object'
    ? (source.quality as Record<string, unknown>)
    : null;

  const quality = qualityRaw
    ? {
        score: clampInt(qualityRaw.score, 0, 100, 0),
        readability: clampInt(qualityRaw.readability, 0, 100, 0),
        completeness: clampInt(qualityRaw.completeness, 0, 100, 0),
        memorability: clampInt(qualityRaw.memorability, 0, 100, 0),
        strengths: toStringArray(qualityRaw.strengths, 10),
        warnings: toStringArray(qualityRaw.warnings, 10),
      }
    : computeQuality(structureV2, learningMeta);

  return {
    _id: String(source._id || ''),
    title: toStringValue(source.title, '맞춤 학습 커리큘럼'),
    description: toStringValue(source.description, ''),
    subject: toStringValue(source.subject, '학습 주제'),
    difficulty:
      source.difficulty === 'intermediate' || source.difficulty === 'advanced'
        ? source.difficulty
        : 'beginner',
    aiModel: toStringValue(source.aiModel, 'openai'),
    structure,
    structureV2,
    learningMeta,
    quality,
    schemaVersion: 'v2',
    progress: normalizeProgress({ progress: source.progress, structureV2 }),
    createdAt: source.createdAt ? String(source.createdAt) : undefined,
    updatedAt: source.updatedAt ? String(source.updatedAt) : undefined,
  };
}
