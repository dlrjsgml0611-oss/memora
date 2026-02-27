'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Markdown from '@/components/ui/markdown';
import { useFeedback } from '@/components/ui/feedback';
import { api } from '@/lib/api/client';
import { BookOpenText, Brain, Castle, FileStack, Lightbulb, RefreshCw, Sparkles, Trash2 } from 'lucide-react';

type SortOption = 'newest' | 'oldest' | 'difficulty-asc' | 'difficulty-desc' | 'title';
type ViewMode = 'grid' | 'list';

interface ConceptHighlight {
  text: string;
  weight?: 1 | 2 | 3;
  reason?: string;
}

interface ConceptVisual {
  id?: string;
  prompt?: string;
  url: string;
  alt?: string;
  provider?: 'openai' | 'claude' | 'gemini';
  generatedAt?: string;
}

interface ConceptItem {
  _id: string;
  topicId?: string;
  title: string;
  content: {
    text: string;
    code?: string;
    images?: string[];
    highlights?: ConceptHighlight[];
    visuals?: ConceptVisual[];
    renderHints?: {
      summary?: string;
      readingLevel?: 'easy' | 'normal' | 'dense';
      lastEnrichedAt?: string;
    };
  };
  curriculumId?: {
    _id?: string;
    title?: string;
    subject?: string;
  };
  aiGenerated?: {
    model?: string;
    generatedAt?: string;
  };
  tags?: string[];
  difficulty?: number;
  createdAt?: string;
}

function getConceptVisuals(concept: ConceptItem) {
  const visualItems = Array.isArray(concept.content?.visuals)
    ? concept.content.visuals.filter((visual) => typeof visual?.url === 'string' && visual.url.length > 0)
    : [];

  if (visualItems.length > 0) {
    return visualItems.slice(0, 2);
  }

  const imageUrls = Array.isArray(concept.content?.images)
    ? concept.content.images.filter((url) => typeof url === 'string' && url.length > 0)
    : [];

  return imageUrls.slice(0, 2).map((url, index) => ({
    id: `legacy-image-${index + 1}`,
    url,
    alt: `${concept.title} 설명 이미지 ${index + 1}`,
  }));
}

function safeTime(value?: string) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export default function ConceptsLibraryPage() {
  const router = useRouter();
  const feedback = useFeedback();
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedConcept, setSelectedConcept] = useState<ConceptItem | null>(null);
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingMindmap, setGeneratingMindmap] = useState(false);
  const [generatingMemoryPalace, setGeneratingMemoryPalace] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [difficultyFilter, setDifficultyFilter] = useState<number | null>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [showFocusOnly, setShowFocusOnly] = useState(false);
  const [refreshingSelected, setRefreshingSelected] = useState(false);
  const [deletingConceptId, setDeletingConceptId] = useState<string | null>(null);

  useEffect(() => {
    loadConcepts();
  }, [page, search]);

  const loadConcepts = async () => {
    try {
      setLoading(true);
      const response = await api.getConcepts({ page, limit: 12, search }) as {
        success: boolean;
        data?: ConceptItem[];
        pagination?: { pages: number };
      };

      if (response.success) {
        setConcepts(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setTotalPages(response.pagination.pages);
        }
      }
    } catch (error) {
      console.error('Failed to load concepts:', error);
      feedback.error('개념 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const filteredConcepts = useMemo(() => {
    return [...concepts]
      .sort((a, b) => {
        switch (sortBy) {
          case 'oldest':
            return safeTime(a.createdAt) - safeTime(b.createdAt);
          case 'difficulty-asc':
            return (a.difficulty || 0) - (b.difficulty || 0);
          case 'difficulty-desc':
            return (b.difficulty || 0) - (a.difficulty || 0);
          case 'title':
            return a.title.localeCompare(b.title);
          default:
            return safeTime(b.createdAt) - safeTime(a.createdAt);
        }
      })
      .filter((concept) => difficultyFilter === null || concept.difficulty === difficultyFilter);
  }, [concepts, difficultyFilter, sortBy]);

  const avgDifficulty = useMemo(() => {
    if (filteredConcepts.length === 0) return 0;
    return (
      filteredConcepts.reduce((sum, concept) => sum + (concept.difficulty || 0), 0) / filteredConcepts.length
    ).toFixed(1);
  }, [filteredConcepts]);

  const handleGenerateFlashcards = async (conceptId: string) => {
    setGeneratingFlashcards(true);
    try {
      const response: any = await api.generateConceptFlashcards(conceptId, 5);
      if (response.success) {
        feedback.success(`${response.data.count}개의 플래시카드를 생성했습니다.`, '플래시카드 생성 완료');
      } else {
        feedback.error('플래시카드 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to generate flashcards:', error);
      feedback.error('플래시카드 생성에 실패했습니다.');
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const handleGenerateMindmap = async (concept: ConceptItem) => {
    setGeneratingMindmap(true);
    try {
      const response: any = await api.generateMindmapFromConcept({
        conceptTitle: concept.title,
        conceptContent: concept.content.text,
      });

      if (response.success) {
        feedback.success('마인드맵을 생성했습니다. 마인드맵 페이지에서 확인해 보세요.');
      } else {
        feedback.error('마인드맵 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to generate mindmap:', error);
      feedback.error('마인드맵 생성에 실패했습니다.');
    } finally {
      setGeneratingMindmap(false);
    }
  };

  const handleGenerateMemoryPalace = async (concept: ConceptItem) => {
    setGeneratingMemoryPalace(true);
    try {
      const response: any = await api.generateMemoryPalaceFromConcept({
        conceptTitle: concept.title,
        conceptContent: concept.content.text,
      });

      if (response.success) {
        feedback.success('기억의 궁전을 생성했습니다. 기억의 궁전 페이지에서 확인해 보세요.');
      } else {
        feedback.error('기억의 궁전 생성에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('Failed to generate memory palace:', error);
      feedback.error('기억의 궁전 생성에 실패했습니다.');
    } finally {
      setGeneratingMemoryPalace(false);
    }
  };

  const handleRefreshSelectedConcept = async () => {
    if (!selectedConcept?._id) return;
    setRefreshingSelected(true);
    try {
      // 1st fetch triggers server-side background enrichment queue
      await api.getConcepts({ page, limit: 12, search });

      // Wait briefly so enrichment worker can persist updates
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // 2nd fetch pulls enriched fields
      const response = await api.getConcepts({ page, limit: 12, search }) as {
        success: boolean;
        data?: ConceptItem[];
      };
      if (response.success && Array.isArray(response.data)) {
        setConcepts(response.data);
        const updated = response.data.find((concept) => concept._id === selectedConcept._id);
        if (updated) {
          setSelectedConcept(updated);
        }
      }
    } catch (error) {
      console.error('Failed to refresh selected concept:', error);
    } finally {
      setRefreshingSelected(false);
    }
  };

  const handleDeleteConcept = async (conceptId: string) => {
    const concept =
      concepts.find((item) => item._id === conceptId) ||
      (selectedConcept?._id === conceptId ? selectedConcept : null);

    if (!concept) return;

    const confirmed = window.confirm(
      `"${concept.title}" 개념을 삭제하시겠어요?\n연결된 플래시카드도 함께 삭제됩니다.`
    );
    if (!confirmed) return;

    try {
      setDeletingConceptId(conceptId);
      await api.deleteConcept(conceptId);

      setConcepts((prev) => prev.filter((item) => item._id !== conceptId));
      if (selectedConcept?._id === conceptId) {
        setSelectedConcept(null);
      }

      feedback.success('개념을 삭제했습니다.');
    } catch (error) {
      console.error('Failed to delete concept:', error);
      feedback.error('개념 삭제에 실패했습니다.');
    } finally {
      setDeletingConceptId((prev) => (prev === conceptId ? null : prev));
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-violet-200/80 bg-gradient-to-r from-violet-50 via-blue-50 to-cyan-50 p-6 md:p-8 shadow-sm">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-300/30 blur-2xl" />
          <div className="absolute -left-6 -bottom-12 h-44 w-44 rounded-full bg-cyan-300/30 blur-2xl" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-violet-700">KNOWLEDGE LIBRARY</p>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 md:text-4xl">개념 라이브러리</h1>
              <p className="mt-2 text-sm text-slate-600 md:text-base">
                AI로 학습한 개념을 정리하고, 카드·마인드맵·기억의 궁전으로 즉시 확장하세요.
              </p>
            </div>
          </div>

          <div className="relative mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs text-slate-500">현재 페이지 개념 수</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{filteredConcepts.length}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs text-slate-500">평균 난이도</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{avgDifficulty}</p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
              <p className="text-xs text-slate-500">페이지</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {page} / {Math.max(totalPages, 1)}
              </p>
            </div>
          </div>
        </section>

        <Card className="border-slate-200/70 bg-white/95">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                placeholder="개념 검색... (제목, 내용, 태그)"
                value={search}
                onChange={(event) => handleSearch(event.target.value)}
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={() => {
                  handleSearch('');
                  setDifficultyFilter(null);
                }}
              >
                초기화
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">정렬</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as SortOption)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="difficulty-asc">난이도 낮은순</option>
                  <option value="difficulty-desc">난이도 높은순</option>
                  <option value="title">제목순</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">난이도</span>
                <select
                  value={difficultyFilter ?? ''}
                  onChange={(event) => setDifficultyFilter(event.target.value ? Number(event.target.value) : null)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">전체</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((difficulty) => (
                    <option key={difficulty} value={difficulty}>
                      {difficulty}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                <button
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    viewMode === 'grid' ? 'bg-violet-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setViewMode('grid')}
                >
                  그리드
                </button>
                <button
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    viewMode === 'list' ? 'bg-violet-500 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  onClick={() => setViewMode('list')}
                >
                  리스트
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center text-slate-500">개념을 불러오는 중...</CardContent>
          </Card>
        ) : filteredConcepts.length === 0 ? (
          <Card>
            <CardContent className="space-y-4 p-12 text-center">
              <Lightbulb className="mx-auto h-10 w-10 text-violet-500" />
              <h3 className="text-xl font-semibold text-slate-900">
                {search ? '검색 결과가 없습니다' : '저장된 개념이 없습니다'}
              </h3>
              <p className="text-slate-600">커리큘럼에서 주제를 학습하면 개념이 여기에 저장됩니다.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredConcepts.map((concept) => (
                  <Card
                    key={concept._id}
                    className="cursor-pointer border-slate-200/80 bg-white/95 transition hover:-translate-y-0.5 hover:shadow-lg"
                    onClick={() => {
                      setSelectedConcept(concept);
                      setShowMarkdown(false);
                    }}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="line-clamp-2 text-lg text-slate-900">{concept.title}</CardTitle>
                      {concept.curriculumId && (
                        <CardDescription className="line-clamp-1 text-xs">
                          {concept.curriculumId.title} · {concept.curriculumId.subject}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const previewVisual = getConceptVisuals(concept)[0];
                        if (!previewVisual) return null;
                        return (
                          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            <div className="aspect-[16/9] w-full overflow-hidden">
                              <img
                                src={previewVisual.url}
                                alt={previewVisual.alt || `${concept.title} 설명 이미지`}
                                loading="lazy"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </div>
                        );
                      })()}
                      <p className="line-clamp-4 text-sm text-slate-600">{concept.content.text}</p>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                          난이도 {concept.difficulty}/10
                        </span>
                        {concept.aiGenerated?.model && (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-violet-700">
                            {concept.aiGenerated.model}
                          </span>
                        )}
                        {Array.isArray(concept.content?.highlights) && concept.content.highlights.length > 0 && (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-800">
                            핵심 {concept.content.highlights.length}
                          </span>
                        )}
                        {getConceptVisuals(concept).length > 0 && (
                          <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-cyan-700">
                            이미지 {getConceptVisuals(concept).length}
                          </span>
                        )}
                      </div>

                      {concept.tags && concept.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {concept.tags.slice(0, 4).map((tag: string, idx: number) => (
                            <span key={idx} className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteConcept(concept._id);
                          }}
                          disabled={deletingConceptId === concept._id}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {deletingConceptId === concept._id ? '삭제 중...' : '삭제'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredConcepts.map((concept) => (
                  <Card
                    key={concept._id}
                    className="cursor-pointer border-slate-200/70 transition hover:bg-slate-50"
                    onClick={() => {
                      setSelectedConcept(concept);
                      setShowMarkdown(false);
                    }}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{concept.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{concept.content.text}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">난이도 {concept.difficulty}</span>
                        {concept.tags?.slice(0, 2).map((tag: string, idx: number) => (
                          <span key={idx} className="rounded-full bg-cyan-100 px-2 py-1 text-cyan-700">
                            #{tag}
                          </span>
                        ))}
                        {Array.isArray(concept.content?.highlights) && concept.content.highlights.length > 0 && (
                          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">핵심</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDeleteConcept(concept._id);
                          }}
                          disabled={deletingConceptId === concept._id}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          {deletingConceptId === concept._id ? '삭제 중...' : '삭제'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  이전
                </Button>
                <span className="px-2 text-sm text-slate-500">
                  {page} / {totalPages}
                </span>
                <Button variant="outline" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                  다음
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedConcept && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setSelectedConcept(null)}
        >
          <Card
            className="max-h-[90vh] w-full max-w-5xl overflow-y-auto border-slate-200/80 bg-white"
            onClick={(event) => event.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="text-2xl">{selectedConcept.title}</CardTitle>
              {selectedConcept.curriculumId && (
                <CardDescription>
                  커리큘럼: {selectedConcept.curriculumId.title} ({selectedConcept.curriculumId.subject})
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">개념 설명</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowFocusOnly((prev) => !prev)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        showFocusOnly
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {showFocusOnly ? '전체 보기' : '핵심만 보기'}
                    </button>
                    <button
                      onClick={() => setShowMarkdown((prev) => !prev)}
                      className={`rounded-full px-3 py-1 text-xs transition ${
                        showMarkdown
                          ? 'bg-violet-100 text-violet-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {showMarkdown ? '마크다운 보기' : '원문 보기'}
                    </button>
                  </div>
                </div>

                {selectedConcept.content?.renderHints?.summary && (
                  <div className="mb-3 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-900">
                    <span className="font-semibold">요약:</span> {selectedConcept.content.renderHints.summary}
                  </div>
                )}

                {(() => {
                  const visuals = getConceptVisuals(selectedConcept);
                  if (visuals.length === 0) return null;
                  return (
                    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      {visuals.map((visual, index) => (
                        <figure key={`${visual.id || visual.url}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100">
                            <img
                              src={visual.url}
                              alt={visual.alt || `${selectedConcept.title} 설명 이미지`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <figcaption className="px-3 py-2 text-xs text-slate-600">
                            {visual.alt || `${selectedConcept.title} 설명 이미지`}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  );
                })()}

                <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  {showMarkdown || showFocusOnly ? (
                    <Markdown
                      content={selectedConcept.content.text}
                      highlights={selectedConcept.content.highlights}
                      showOnlyHighlights={showFocusOnly}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{selectedConcept.content.text}</div>
                  )}
                </div>
              </div>

              {selectedConcept.content.code && (
                <div>
                  <h3 className="mb-3 text-base font-semibold text-slate-900">코드 예제</h3>
                  <pre className="overflow-x-auto rounded-2xl bg-slate-900 p-4 text-slate-100">
                    <code>{selectedConcept.content.code}</code>
                  </pre>
                </div>
              )}

              {selectedConcept.tags && selectedConcept.tags.length > 0 && (
                <div>
                  <h3 className="mb-3 text-base font-semibold text-slate-900">태그</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedConcept.tags.map((tag: string, idx: number) => (
                      <span key={idx} className="rounded-full bg-cyan-100 px-3 py-1 text-sm text-cyan-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                <div>
                  <p className="text-slate-500">난이도</p>
                  <p className="font-semibold text-slate-900">{selectedConcept.difficulty}/10</p>
                </div>
                <div>
                  <p className="text-slate-500">AI 모델</p>
                  <p className="font-semibold text-slate-900">{selectedConcept.aiGenerated?.model || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-500">생성일</p>
                  <p className="font-semibold text-slate-900">
                    {new Date(selectedConcept.createdAt || Date.now()).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">핵심 하이라이트</p>
                  <p className="font-semibold text-slate-900">{selectedConcept.content?.highlights?.length || 0}개</p>
                </div>
                <div>
                  <p className="text-slate-500">설명 이미지</p>
                  <p className="font-semibold text-slate-900">{getConceptVisuals(selectedConcept).length}개</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-blue-50 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-violet-600" />
                  AI 학습 도구 생성
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => void handleGenerateFlashcards(selectedConcept._id)}
                    disabled={generatingFlashcards}
                  >
                    <FileStack className="mr-2 h-4 w-4" />
                    {generatingFlashcards ? '생성 중...' : '플래시카드 5개'}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => void handleGenerateMindmap(selectedConcept)}
                    disabled={generatingMindmap}
                  >
                    <Brain className="mr-2 h-4 w-4" />
                    {generatingMindmap ? '생성 중...' : '마인드맵 생성'}
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start"
                    onClick={() => void handleGenerateMemoryPalace(selectedConcept)}
                    disabled={generatingMemoryPalace}
                  >
                    <Castle className="mr-2 h-4 w-4" />
                    {generatingMemoryPalace ? '생성 중...' : '기억의 궁전 생성'}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="outline" onClick={() => void handleRefreshSelectedConcept()} disabled={refreshingSelected}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${refreshingSelected ? 'animate-spin' : ''}`} />
                  보강 새로고침
                </Button>
                <Button
                  onClick={() => {
                    if (selectedConcept.curriculumId?._id) {
                      router.push(`/curriculums/${selectedConcept.curriculumId._id}`);
                    } else {
                      feedback.info('연결된 커리큘럼 정보를 찾을 수 없습니다.');
                    }
                  }}
                >
                    <BookOpenText className="mr-2 h-4 w-4" />
                    커리큘럼으로 이동
                  </Button>
                <Button
                  variant="destructive"
                  onClick={() => void handleDeleteConcept(selectedConcept._id)}
                  disabled={deletingConceptId === selectedConcept._id}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deletingConceptId === selectedConcept._id ? '삭제 중...' : '개념 삭제'}
                </Button>
                <Button variant="outline" onClick={() => setSelectedConcept(null)}>
                  닫기
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
