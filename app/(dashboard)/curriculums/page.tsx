'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import type { CurriculumDocumentV2 } from '@/types';
import {
  ArrowRight,
  BookOpen,
  Clock3,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';
type AIModel = 'openai' | 'claude' | 'gemini';

interface CurriculumFormData {
  goal: string;
  subject: string;
  difficulty: Difficulty;
  aiModel: AIModel;
}

const difficultyConfig: Record<Difficulty, { label: string; bg: string; text: string }> = {
  beginner: { label: '초급', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  intermediate: { label: '중급', bg: 'bg-amber-50', text: 'text-amber-700' },
  advanced: { label: '고급', bg: 'bg-rose-50', text: 'text-rose-700' },
};

const aiLabel: Record<AIModel, string> = {
  openai: 'OpenAI GPT',
  claude: 'Claude',
  gemini: 'Gemini',
};

function getTotalTopics(curriculum: CurriculumDocumentV2) {
  return curriculum.structureV2.reduce((sum, module) => sum + module.topics.length, 0);
}

function getTotalHours(curriculum: CurriculumDocumentV2) {
  return curriculum.structureV2.reduce((sum, module) => sum + module.estimatedHours, 0);
}

function getQualityStyle(score: number) {
  if (score >= 80) {
    return {
      label: '우수',
      chip: 'bg-emerald-100 text-emerald-700',
      ring: 'ring-emerald-400',
    };
  }
  if (score >= 60) {
    return {
      label: '양호',
      chip: 'bg-amber-100 text-amber-700',
      ring: 'ring-amber-400',
    };
  }
  return {
    label: '보완 필요',
    chip: 'bg-rose-100 text-rose-700',
    ring: 'ring-rose-400',
  };
}

export default function CurriculumsPage() {
  const [curriculums, setCurriculums] = useState<CurriculumDocumentV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CurriculumFormData>({
    goal: '',
    subject: '',
    difficulty: 'beginner',
    aiModel: 'openai',
  });

  useEffect(() => {
    void loadCurriculums();
  }, []);

  const sortedCurriculums = useMemo(
    () => [...curriculums].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [curriculums]
  );

  const loadCurriculums = async () => {
    try {
      const response = await api.getCurriculums({ page: 1, limit: 50 });
      if (response.success && Array.isArray(response.data)) {
        setCurriculums(response.data);
      }
    } catch (error) {
      console.error('Failed to load curriculums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response = await api.createCurriculum(formData);
      if (response.success && response.data) {
        setCurriculums((prev) => [response.data as CurriculumDocumentV2, ...prev]);
        setShowCreateForm(false);
        setFormData({ goal: '', subject: '', difficulty: 'beginner', aiModel: 'openai' });
      }
    } catch (error: any) {
      const errorMessage = error?.message || '커리큘럼 생성에 실패했습니다';
      alert(errorMessage.includes('timeout') ? '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' : errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.deleteCurriculum(id);
      setCurriculums((prev) => prev.filter((curriculum) => curriculum._id !== id));
    } catch (error) {
      console.error('Failed to delete curriculum:', error);
      alert('삭제에 실패했습니다');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">커리큘럼</h1>
            <p className="mt-1 text-slate-500">가독성과 암기 효율을 고려한 AI 맞춤 학습 경로</p>
          </div>
          <Button onClick={() => setShowCreateForm((prev) => !prev)} className="rounded-xl shadow-lg shadow-blue-500/25">
            {showCreateForm ? (
              <>
                <X className="mr-2 h-4 w-4" />
                취소
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                새 커리큘럼
              </>
            )}
          </Button>
        </div>

        {showCreateForm && (
          <Card className="border-0 bg-gradient-to-br from-white to-blue-50/40 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-500" />
                새 커리큘럼 만들기
              </CardTitle>
              <CardDescription>
                입력이 구체적일수록 학습 목표, 핵심 포인트, 암기 힌트 품질이 좋아집니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">주제</Label>
                  <Input
                    id="subject"
                    placeholder="예: 파이썬 프로그래밍, 미적분학, 영어 회화"
                    value={formData.subject}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                    required
                    disabled={creating}
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">학습 목표</Label>
                  <Textarea
                    id="goal"
                    className="min-h-[120px] rounded-xl"
                    placeholder="예: 6주 안에 파이썬 기초 문법을 익히고, 간단한 자동화 스크립트를 직접 작성하고 싶어요."
                    value={formData.goal}
                    onChange={(e) => setFormData((prev) => ({ ...prev, goal: e.target.value }))}
                    required
                    disabled={creating}
                  />
                  <p className="text-xs text-slate-500">권장: 기간, 현재 실력, 최종 산출물(프로젝트/시험/실무)을 함께 적어주세요.</p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">난이도</Label>
                    <select
                      id="difficulty"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.difficulty}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          difficulty: e.target.value as Difficulty,
                        }))
                      }
                      disabled={creating}
                    >
                      <option value="beginner">초급</option>
                      <option value="intermediate">중급</option>
                      <option value="advanced">고급</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiModel">AI 모델</Label>
                    <select
                      id="aiModel"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.aiModel}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          aiModel: e.target.value as AIModel,
                        }))
                      }
                      disabled={creating}
                    >
                      <option value="openai">OpenAI GPT</option>
                      <option value="claude">Claude</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" className="h-12 w-full rounded-xl shadow-lg shadow-blue-500/25" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI가 고품질 커리큘럼을 생성 중입니다...
                    </>
                  ) : (
                    '커리큘럼 생성하기'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="flex flex-col items-center p-12">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-500" />
              <p className="text-slate-500">커리큘럼을 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : sortedCurriculums.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="space-y-4 p-12 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100">
                <GraduationCap className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">아직 커리큘럼이 없습니다</h3>
              <p className="text-slate-500">첫 커리큘럼을 만들고 학습 루틴을 시작해보세요.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {sortedCurriculums.map((curriculum) => {
              const diff = difficultyConfig[curriculum.difficulty] || difficultyConfig.beginner;
              const totalTopics = getTotalTopics(curriculum);
              const totalHours = getTotalHours(curriculum);
              const quality = getQualityStyle(curriculum.quality.score);

              return (
                <Card key={curriculum._id} className="group border-0 shadow-lg transition-all duration-300 hover:shadow-xl">
                  <CardHeader className="space-y-3 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1 text-lg">{curriculum.title}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">{curriculum.description}</CardDescription>
                      </div>
                      <div className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quality.chip}`}>
                        품질 {curriculum.quality.score}점
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{curriculum.subject}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${diff.bg} ${diff.text}`}>{diff.label}</span>
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">{aiLabel[curriculum.aiModel as AIModel] || curriculum.aiModel}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${quality.chip}`}>{quality.label}</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div>
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-slate-500">진행률</span>
                        <span className="font-medium text-slate-700">{curriculum.progress.overallPercentage}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${curriculum.progress.overallPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4" />
                        <span>{curriculum.structureV2.length}개 모듈 / {totalTopics}개 토픽</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-self-end">
                        <Clock3 className="h-4 w-4" />
                        <span>총 {totalHours}시간</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between">
                        <span>권장 주간 학습</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-2 ${quality.ring}`}>
                          주 {curriculum.learningMeta.recommendedWeeklyHours}시간
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{new Date(curriculum.createdAt || Date.now()).toLocaleDateString('ko-KR')}</span>
                      <span>{curriculum.quality.strengths[0] || '학습 최적화 커리큘럼'}</span>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        className="flex-1 rounded-xl transition-shadow group-hover:shadow-lg group-hover:shadow-blue-500/20"
                        size="sm"
                        onClick={() => window.location.assign(`/curriculums/${curriculum._id}`)}
                      >
                        학습 시작
                        <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(curriculum._id)}
                        className="rounded-xl border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
