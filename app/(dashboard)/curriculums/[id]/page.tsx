'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Markdown from '@/components/ui/markdown';
import { useFeedback } from '@/components/ui/feedback';
import { api } from '@/lib/api/client';
import type {
  CurriculumDocumentV2,
  CurriculumModuleV2,
  CurriculumTopicV2,
} from '@/types';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Circle,
  Clock3,
  Loader2,
  MessageCircleQuestionMark,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react';

type GenerationMode = 'encyclopedia' | 'conversational';
type TopicViewFilter = 'all' | 'pending' | 'completed';

interface ConceptSummary {
  _id: string;
  topicId?: string;
  title: string;
  content: {
    text: string;
    code?: string;
    images?: string[];
    highlights?: Array<{
      text: string;
      weight?: 1 | 2 | 3;
      reason?: string;
    }>;
    visuals?: Array<{
      id?: string;
      prompt?: string;
      url: string;
      alt?: string;
      provider?: 'openai' | 'claude' | 'gemini';
      generatedAt?: string;
      width?: number;
      height?: number;
    }>;
    renderHints?: {
      summary?: string;
      readingLevel?: 'easy' | 'normal' | 'dense';
      lastEnrichedAt?: string;
    };
  };
  aiGenerated?: {
    model?: string;
    generatedAt?: string;
  };
  createdAt?: string;
}

interface ProgressResponse {
  completedTopics: string[];
  overallPercentage: number;
  currentModule: string;
}

interface ModuleTopicItem {
  module: CurriculumModuleV2;
  topic: CurriculumTopicV2;
}

const viewFilterLabels: Record<TopicViewFilter, string> = {
  all: '전체',
  pending: '미완료',
  completed: '완료',
};

function getConceptKeyByTopicId(topicId?: string) {
  return topicId ? `topic:${topicId}` : '';
}

function getConceptKeyByTitle(title: string) {
  return `title:${title}`;
}

function isTopicVisible(topicId: string, completedTopicSet: Set<string>, filter: TopicViewFilter) {
  if (filter === 'all') return true;
  if (filter === 'completed') return completedTopicSet.has(topicId);
  return !completedTopicSet.has(topicId);
}

function qualityTone(score: number) {
  if (score >= 80) return 'text-emerald-700 bg-emerald-100';
  if (score >= 60) return 'text-amber-700 bg-amber-100';
  return 'text-rose-700 bg-rose-100';
}

export default function CurriculumDetailPage() {
  const params = useParams();
  const feedback = useFeedback();

  const [curriculum, setCurriculum] = useState<CurriculumDocumentV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingConcept, setGeneratingConcept] = useState<string | null>(null);
  const [generatingFlashcards, setGeneratingFlashcards] = useState<string | null>(null);
  const [concepts, setConcepts] = useState<Record<string, ConceptSummary>>({});
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('conversational');
  const [markdownView, setMarkdownView] = useState<Record<string, boolean>>({});
  const [focusOnlyView, setFocusOnlyView] = useState<Record<string, boolean>>({});
  const [togglingTopic, setTogglingTopic] = useState<string | null>(null);
  const [bulkGeneratingConcepts, setBulkGeneratingConcepts] = useState(false);
  const [bulkGeneratingFlashcards, setBulkGeneratingFlashcards] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<TopicViewFilter>('all');

  const curriculumId = typeof params.id === 'string' ? params.id : '';

  useEffect(() => {
    if (!curriculumId) return;
    void loadCurriculum(curriculumId);
    void loadExistingConcepts(curriculumId);
  }, [curriculumId]);

  const completedTopicSet = useMemo(
    () => new Set(curriculum?.progress.completedTopics || []),
    [curriculum?.progress.completedTopics]
  );

  const moduleTopicItems = useMemo(() => {
    if (!curriculum) return [] as ModuleTopicItem[];
    return curriculum.structureV2.flatMap((module) => module.topics.map((topic) => ({ module, topic })));
  }, [curriculum]);

  const visibleTopicItems = useMemo(
    () => moduleTopicItems.filter(({ topic }) => isTopicVisible(topic.topicId, completedTopicSet, viewFilter)),
    [moduleTopicItems, completedTopicSet, viewFilter]
  );

  const nextRecommendedTopic = useMemo(
    () => moduleTopicItems.find(({ topic }) => !completedTopicSet.has(topic.topicId)),
    [moduleTopicItems, completedTopicSet]
  );

  const uniqueConceptCount = useMemo(
    () =>
      new Set(
        Object.values(concepts)
          .map((concept) => concept?._id)
          .filter(Boolean)
      ).size,
    [concepts]
  );

  const loadCurriculum = async (id: string) => {
    try {
      const response = await api.getCurriculum(id);
      if (response.success && response.data) {
        setCurriculum(response.data);
      }
    } catch (error) {
      console.error('Failed to load curriculum:', error);
      feedback.error('커리큘럼을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingConcepts = async (id: string) => {
    try {
      const response = (await api.getConcepts({
        curriculumId: id,
        limit: 200,
      })) as { success: boolean; data?: ConceptSummary[] };

      if (response.success && Array.isArray(response.data)) {
        const conceptsMap: Record<string, ConceptSummary> = {};

        response.data.forEach((concept) => {
          if (concept.topicId) {
            conceptsMap[getConceptKeyByTopicId(concept.topicId)] = concept;
          }
          conceptsMap[getConceptKeyByTitle(concept.title)] = concept;
        });

        setConcepts(conceptsMap);
      }
    } catch (error) {
      console.error('Failed to load existing concepts:', error);
    }
  };

  const getTopicConcept = (topic: CurriculumTopicV2) =>
    concepts[getConceptKeyByTopicId(topic.topicId)] || concepts[getConceptKeyByTitle(topic.title)];

  const handleGenerateConcept = async (topic: CurriculumTopicV2) => {
    if (!curriculum) return;

    setGeneratingConcept(topic.topicId);
    try {
      const response = (await api.createConcept({
        curriculumId: curriculum._id,
        topicId: topic.topicId,
        topicTitle: topic.title,
        aiModel: curriculum.aiModel,
        mode: generationMode,
      })) as { success: boolean; data?: ConceptSummary; message?: string };

      if (response.success && response.data) {
        setConcepts((prev) => ({
          ...prev,
          [getConceptKeyByTopicId(topic.topicId)]: response.data as ConceptSummary,
          [getConceptKeyByTitle(topic.title)]: response.data as ConceptSummary,
        }));
        setExpandedTopic(topic.topicId);
        setBulkStatus(`"${topic.title}" 개념을 생성했습니다.`);
      } else {
        feedback.error(response.message || '개념 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to generate concept:', error);
      const errorMessage = error?.message || '개념 생성에 실패했습니다';
      if (errorMessage.includes('timeout') || errorMessage.includes('fetch')) {
        feedback.error('요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
      } else {
        feedback.error(`개념 생성 실패: ${errorMessage}`);
      }
    } finally {
      setGeneratingConcept(null);
    }
  };

  const handleGenerateFlashcards = async (conceptId: string) => {
    setGeneratingFlashcards(conceptId);
    try {
      const response = (await api.generateConceptFlashcards(conceptId, 5)) as {
        success: boolean;
        data?: { count?: number };
      };

      if (response.success) {
        const count = response.data?.count || 0;
        setBulkStatus(count > 0 ? `${count}개의 플래시카드를 생성했습니다.` : '플래시카드가 생성되지 않았습니다.');
      } else {
        feedback.error('플래시카드 생성에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to generate flashcards:', error);
      feedback.error('플래시카드 생성에 실패했습니다.');
    } finally {
      setGeneratingFlashcards(null);
    }
  };

  const handleToggleComplete = async (topicId: string) => {
    if (!curriculum) return;

    setTogglingTopic(topicId);
    const isCompleted = completedTopicSet.has(topicId);

    try {
      const response = await api.updateCurriculumProgress(curriculum._id, {
        topicId,
        completed: !isCompleted,
      });

      if (response.success && response.data) {
        const progress = response.data as ProgressResponse;
        setCurriculum((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            progress: {
              ...prev.progress,
              completedTopics: progress.completedTopics,
              overallPercentage: progress.overallPercentage,
              currentModule: progress.currentModule,
            },
          };
        });
      }
    } catch (error) {
      console.error('Failed to toggle completion:', error);
      feedback.error('진행률 업데이트에 실패했습니다.');
    } finally {
      setTogglingTopic(null);
    }
  };

  const handleGenerateAllConcepts = async () => {
    if (!curriculum) return;

    setBulkGeneratingConcepts(true);
    setBulkStatus(null);

    try {
      let createdCount = 0;

      for (const { topic } of visibleTopicItems) {
        if (getTopicConcept(topic)) continue;

        const response = (await api.createConcept({
          curriculumId: curriculum._id,
          topicId: topic.topicId,
          topicTitle: topic.title,
          aiModel: curriculum.aiModel,
          mode: generationMode,
        })) as { success: boolean; data?: ConceptSummary };

        if (response.success && response.data) {
          createdCount += 1;
          setConcepts((prev) => ({
            ...prev,
            [getConceptKeyByTopicId(topic.topicId)]: response.data as ConceptSummary,
            [getConceptKeyByTitle(topic.title)]: response.data as ConceptSummary,
          }));
        }
      }

      setBulkStatus(
        createdCount > 0
          ? `필터된 토픽 개념 ${createdCount}개를 생성했습니다.`
          : '생성할 새 개념이 없습니다.'
      );
    } catch (error) {
      console.error('Failed to generate all concepts:', error);
      setBulkStatus('전체 개념 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkGeneratingConcepts(false);
    }
  };

  const handleGenerateAllFlashcards = async () => {
    setBulkGeneratingFlashcards(true);
    setBulkStatus(null);

    try {
      const conceptList = Array.from(
        new Map(
          Object.values(concepts)
            .filter((concept) => concept?._id)
            .map((concept) => [concept._id, concept])
        ).values()
      );

      if (conceptList.length === 0) {
        setBulkStatus('먼저 개념을 생성해주세요.');
        return;
      }

      let totalFlashcards = 0;
      for (const concept of conceptList) {
        const response = (await api.generateConceptFlashcards(concept._id, 5)) as {
          success: boolean;
          data?: { count?: number };
        };
        if (response.success) {
          totalFlashcards += response.data?.count || 0;
        }
      }

      setBulkStatus(
        totalFlashcards > 0
          ? `전체 플래시카드 ${totalFlashcards}개를 생성했습니다.`
          : '생성된 플래시카드가 없습니다.'
      );
    } catch (error) {
      console.error('Failed to generate all flashcards:', error);
      setBulkStatus('전체 플래시카드 생성 중 오류가 발생했습니다.');
    } finally {
      setBulkGeneratingFlashcards(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <div className="text-gray-500">커리큘럼을 불러오는 중...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!curriculum) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center">
          <div className="text-gray-500">커리큘럼을 찾을 수 없습니다.</div>
        </div>
      </DashboardLayout>
    );
  }

  const totalTopics = moduleTopicItems.length;
  const completedTopics = curriculum.progress.completedTopics.length;
  const qualityClass = qualityTone(curriculum.quality.score);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 p-6 shadow-sm md:p-8">
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-300/30 blur-2xl" />
          <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-cyan-300/30 blur-2xl" />

          <div className="relative space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-indigo-700">CURRICULUM LEARNING HUB</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">{curriculum.title}</h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">{curriculum.description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">{curriculum.subject}</span>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs text-purple-700">
                {curriculum.difficulty === 'beginner' && '초급'}
                {curriculum.difficulty === 'intermediate' && '중급'}
                {curriculum.difficulty === 'advanced' && '고급'}
              </span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs text-green-700">{curriculum.aiModel}</span>
              <span className={`rounded-full px-3 py-1 text-xs ${qualityClass}`}>
                품질 {curriculum.quality.score}점
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">전체 토픽</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{totalTopics}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">완료 토픽</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{completedTopics}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">생성된 개념</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{uniqueConceptCount}</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">주간 권장 시간</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{curriculum.learningMeta.recommendedWeeklyHours}h</p>
              </div>
              <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                <p className="text-xs text-slate-500">진행률</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{curriculum.progress.overallPercentage}%</p>
              </div>
            </div>

            {nextRecommendedTopic && (
              <div className="rounded-2xl border border-indigo-200 bg-white/90 p-4 text-sm text-slate-700">
                <span className="font-semibold text-indigo-700">다음 추천 학습:</span>{' '}
                {nextRecommendedTopic.module.title} · {nextRecommendedTopic.topic.title}
              </div>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-blue-500" />
                사전지식
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {curriculum.learningMeta.prerequisites.length > 0 ? (
                curriculum.learningMeta.prerequisites.map((item) => (
                  <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">필수 사전지식 없음</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                학습 완료 기준
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {curriculum.learningMeta.targetOutcomes.length > 0 ? (
                curriculum.learningMeta.targetOutcomes.map((item) => (
                  <div key={item} className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">완료 기준이 아직 생성되지 않았습니다.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Brain className="h-4 w-4 text-emerald-500" />
                학습/암기 팁
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {curriculum.learningMeta.studyTips.length > 0 ? (
                curriculum.learningMeta.studyTips.map((item) => (
                  <div key={item} className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">학습 팁이 아직 생성되지 않았습니다.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>학습 품질 지표</CardTitle>
            <CardDescription>생성된 커리큘럼의 가독성/완성도/암기 전환도를 확인하세요.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: '가독성', value: curriculum.quality.readability },
              { label: '완성도', value: curriculum.quality.completeness },
              { label: '암기 친화성', value: curriculum.quality.memorability },
            ].map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-200 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-600">{metric.label}</span>
                  <span className="font-semibold text-slate-800">{metric.value}점</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${metric.value}%` }} />
                </div>
              </div>
            ))}

            {curriculum.quality.warnings.length > 0 && (
              <div className="md:col-span-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="mb-2 font-semibold">보완 포인트</p>
                <ul className="space-y-1">
                  {curriculum.quality.warnings.map((warning) => (
                    <li key={warning}>- {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>학습 제어</CardTitle>
            <CardDescription>생성 모드와 토픽 필터를 조정해 학습 흐름을 최적화하세요.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">개념 생성 모드</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={generationMode === 'conversational' ? 'default' : 'outline'}
                    onClick={() => setGenerationMode('conversational')}
                    className="h-auto py-3"
                  >
                    <div className="text-left">
                      <div className="font-semibold">구술식</div>
                      <div className="text-xs opacity-80">쉽게 풀어 설명</div>
                    </div>
                  </Button>
                  <Button
                    variant={generationMode === 'encyclopedia' ? 'default' : 'outline'}
                    onClick={() => setGenerationMode('encyclopedia')}
                    className="h-auto py-3"
                  >
                    <div className="text-left">
                      <div className="font-semibold">백과사전식</div>
                      <div className="text-xs opacity-80">정확한 정의 중심</div>
                    </div>
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-3">
                <p className="mb-2 text-xs font-semibold text-slate-500">토픽 보기</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['all', 'pending', 'completed'] as TopicViewFilter[]).map((filter) => (
                    <Button
                      key={filter}
                      variant={viewFilter === filter ? 'default' : 'outline'}
                      onClick={() => setViewFilter(filter)}
                      className="h-10"
                    >
                      {viewFilterLabels[filter]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {bulkStatus && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                {bulkStatus}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Button onClick={handleGenerateAllConcepts} disabled={bulkGeneratingConcepts} className="h-12">
                {bulkGeneratingConcepts ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    개념 일괄 생성 중...
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    현재 필터 토픽 개념 일괄 생성
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleGenerateAllFlashcards} disabled={bulkGeneratingFlashcards} className="h-12">
                {bulkGeneratingFlashcards ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    카드 일괄 생성 중...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    생성된 개념으로 카드 일괄 생성
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">학습 모듈</h2>
            <span className="text-sm text-slate-500">
              표시 중: {visibleTopicItems.length} / {totalTopics} 토픽
            </span>
          </div>

          {curriculum.structureV2.map((module, moduleIndex) => {
            const visibleTopics = module.topics.filter((topic) =>
              isTopicVisible(topic.topicId, completedTopicSet, viewFilter)
            );

            if (visibleTopics.length === 0) {
              return null;
            }

            const moduleCompleted = module.topics.filter((topic) => completedTopicSet.has(topic.topicId)).length;

            return (
              <Card key={module.moduleId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                      {moduleIndex + 1}
                    </span>
                    {module.title}
                  </CardTitle>
                  <CardDescription className="space-y-1">
                    <span className="block">예상 학습 시간: {module.estimatedHours}시간</span>
                    <span className="block">진행 상태: {moduleCompleted}/{module.topics.length} 완료</span>
                    {module.moduleSummary && <span className="block text-slate-600">{module.moduleSummary}</span>}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  {module.moduleObjectives.length > 0 && (
                    <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-800">
                      <p className="mb-1 font-semibold">모듈 학습 목표</p>
                      <ul className="space-y-1">
                        {module.moduleObjectives.map((objective) => (
                          <li key={objective}>- {objective}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {visibleTopics.map((topic, topicIndex) => {
                    const isCompleted = completedTopicSet.has(topic.topicId);
                    const topicConcept = getTopicConcept(topic);
                    const markdownKey = topic.topicId || topic.title;

                    return (
                      <div key={topic.topicId} className="overflow-hidden rounded-lg border border-gray-200">
                        <div className="flex flex-col gap-3 bg-gray-50 p-4 md:flex-row md:items-start md:justify-between">
                          <div className="flex flex-1 items-start gap-3">
                            <button
                              onClick={() => handleToggleComplete(topic.topicId)}
                              disabled={togglingTopic === topic.topicId}
                              className="mt-0.5 flex-shrink-0 focus:outline-none"
                              title={isCompleted ? '학습 완료 취소' : '학습 완료로 표시'}
                            >
                              {togglingTopic === topic.topicId ? (
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                              ) : isCompleted ? (
                                <CheckCircle2 className="h-6 w-6 text-green-500" />
                              ) : (
                                <Circle className="h-6 w-6 text-gray-300 hover:text-gray-400" />
                              )}
                            </button>

                            <div className="space-y-1">
                              <div className="text-sm text-gray-500">
                                {moduleIndex + 1}.{topicIndex + 1}
                              </div>
                              <h3 className={`text-base font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                {topic.title}
                              </h3>
                              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">목표 {topic.learningObjectives.length}개</span>
                                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">핵심 {topic.keyPoints.length}개</span>
                                {topicConcept && (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">개념 생성됨</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 md:ml-4">
                            {topicConcept && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedTopic(expandedTopic === topic.topicId ? null : topic.topicId)}
                              >
                                {expandedTopic === topic.topicId ? '접기' : '개념 보기'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleGenerateConcept(topic)}
                              disabled={generatingConcept === topic.topicId}
                            >
                              {generatingConcept === topic.topicId ? 'AI 생성 중...' : topicConcept ? '개념 재생성' : '개념 생성'}
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 border-t border-gray-100 bg-white p-4 md:grid-cols-2">
                          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
                            <p className="mb-2 text-sm font-semibold text-blue-700">학습 목표</p>
                            <ul className="space-y-1 text-sm text-blue-900">
                              {topic.learningObjectives.map((objective) => (
                                <li key={objective}>- {objective}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-3">
                            <p className="mb-2 text-sm font-semibold text-indigo-700">핵심 포인트</p>
                            <ul className="space-y-1 text-sm text-indigo-900">
                              {topic.keyPoints.map((point) => (
                                <li key={point}>- {point}</li>
                              ))}
                            </ul>
                          </div>

                          {topic.example && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 md:col-span-2">
                              <p className="mb-1 font-semibold">예시</p>
                              {topic.example}
                            </div>
                          )}

                          {topic.memoryHint && (
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                              <p className="mb-1 flex items-center gap-1 font-semibold">
                                <Brain className="h-4 w-4" />
                                기억 힌트
                              </p>
                              {topic.memoryHint}
                            </div>
                          )}

                          {topic.checkpointQuestion && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                              <p className="mb-1 flex items-center gap-1 font-semibold">
                                <MessageCircleQuestionMark className="h-4 w-4" />
                                셀프 체크 질문
                              </p>
                              {topic.checkpointQuestion}
                            </div>
                          )}
                        </div>

                        {expandedTopic === topic.topicId && topicConcept && (
                          <div className="border-t border-gray-200 bg-white p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <h4 className="text-lg font-semibold text-gray-900">{topicConcept.title}</h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    setFocusOnlyView((prev) => ({
                                      ...prev,
                                      [markdownKey]: !prev[markdownKey],
                                    }))
                                  }
                                  className={`rounded-full px-3 py-1 text-xs transition ${
                                    focusOnlyView[markdownKey]
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {focusOnlyView[markdownKey] ? '전체 보기' : '핵심만 보기'}
                                </button>
                                <button
                                  onClick={() =>
                                    setMarkdownView((prev) => ({
                                      ...prev,
                                      [markdownKey]: !prev[markdownKey],
                                    }))
                                  }
                                  className={`rounded-full px-3 py-1 text-xs transition ${
                                    markdownView[markdownKey]
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {markdownView[markdownKey] ? '마크다운 보기' : '원본 보기'}
                                </button>
                              </div>
                            </div>

                            {topicConcept.content?.renderHints?.summary && (
                              <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                                <span className="font-semibold">요약:</span> {topicConcept.content.renderHints.summary}
                              </div>
                            )}

                            {(() => {
                              const visualList = Array.isArray(topicConcept.content.visuals) && topicConcept.content.visuals.length > 0
                                ? topicConcept.content.visuals
                                    .filter((visual) => Boolean(visual?.url))
                                    .slice(0, 2)
                                : (topicConcept.content.images || [])
                                    .filter((imageUrl) => typeof imageUrl === 'string' && imageUrl.length > 0)
                                    .slice(0, 2)
                                    .map((imageUrl, index) => ({
                                      id: `legacy-image-${index + 1}`,
                                      url: imageUrl,
                                      alt: `${topicConcept.title} 설명 이미지 ${index + 1}`,
                                      prompt: '',
                                      provider: curriculum.aiModel as 'openai' | 'claude' | 'gemini',
                                    }));

                              if (visualList.length === 0) return null;

                              return (
                                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                  {visualList.map((visual, index) => (
                                    <figure key={`${visual.id || visual.url}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                                      <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                                        <img
                                          src={visual.url}
                                          alt={visual.alt || `${topicConcept.title} 설명 이미지`}
                                          loading="lazy"
                                          className="h-full w-full object-cover"
                                        />
                                      </div>
                                      <figcaption className="space-y-1 px-3 py-2 text-xs text-slate-600">
                                        <div className="font-medium text-slate-700">{visual.alt || `${topicConcept.title} 설명 이미지`}</div>
                                        {visual.prompt && <div className="line-clamp-2">{visual.prompt}</div>}
                                      </figcaption>
                                    </figure>
                                  ))}
                                </div>
                              );
                            })()}

                            <div className="max-h-[420px] overflow-auto rounded-lg bg-gray-50 p-4">
                              {markdownView[markdownKey] || focusOnlyView[markdownKey] ? (
                                <Markdown
                                  content={topicConcept.content.text}
                                  highlights={topicConcept.content.highlights}
                                  showOnlyHighlights={Boolean(focusOnlyView[markdownKey])}
                                />
                              ) : (
                                <div className="whitespace-pre-wrap text-gray-700">{topicConcept.content.text}</div>
                              )}
                            </div>

                            {topicConcept.content.code && (
                              <pre className="mt-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-gray-100">
                                <code>{topicConcept.content.code}</code>
                              </pre>
                            )}

                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 text-xs text-gray-500">
                              <div className="flex flex-wrap items-center gap-2">
                                <span>AI 모델: {topicConcept.aiGenerated?.model || curriculum.aiModel}</span>
                                <span>•</span>
                                <span>
                                  생성 시각:{' '}
                                  {new Date(
                                    topicConcept.aiGenerated?.generatedAt ||
                                      topicConcept.createdAt ||
                                      Date.now()
                                  ).toLocaleString('ko-KR')}
                                </span>
                              </div>

                              <Button
                                size="sm"
                                onClick={() => handleGenerateFlashcards(topicConcept._id)}
                                disabled={generatingFlashcards === topicConcept._id}
                              >
                                {generatingFlashcards === topicConcept._id ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    카드 생성 중...
                                  </>
                                ) : (
                                  <>
                                    <Clock3 className="mr-2 h-4 w-4" />
                                    이 토픽 카드 5개 생성
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
