'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import { Plus, X, GraduationCap, Sparkles, Trash2, ArrowRight, Loader2, BookOpen } from 'lucide-react';

export default function CurriculumsPage() {
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    goal: '',
    subject: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    aiModel: 'openai' as 'openai' | 'claude' | 'gemini',
  });

  useEffect(() => {
    loadCurriculums();
  }, []);

  const loadCurriculums = async () => {
    try {
      const response: any = await api.getCurriculums();
      if (response.success) setCurriculums(response.data || []);
    } catch (error) {
      console.error('Failed to load curriculums:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const response: any = await api.createCurriculum(formData);
      if (response.success) {
        setCurriculums([response.data, ...curriculums]);
        setShowCreateForm(false);
        setFormData({ goal: '', subject: '', difficulty: 'beginner', aiModel: 'openai' });
      }
    } catch (error: any) {
      const errorMessage = error.message || '커리큘럼 생성에 실패했습니다';
      alert(errorMessage.includes('timeout') ? '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' : errorMessage);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.deleteCurriculum(id);
      setCurriculums(curriculums.filter((c) => c._id !== id));
    } catch (error) {
      alert('삭제에 실패했습니다');
    }
  };

  const difficultyConfig: Record<string, { label: string; bg: string; text: string }> = {
    beginner: { label: '초급', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    intermediate: { label: '중급', bg: 'bg-amber-50', text: 'text-amber-600' },
    advanced: { label: '고급', bg: 'bg-rose-50', text: 'text-rose-600' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">커리큘럼</h1>
            <p className="text-slate-500 mt-1">AI가 생성한 맞춤형 학습 경로</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)} className="rounded-xl shadow-lg shadow-blue-500/25">
            {showCreateForm ? <><X className="w-4 h-4 mr-2" />취소</> : <><Plus className="w-4 h-4 mr-2" />새 커리큘럼</>}
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                새 커리큘럼 만들기
              </CardTitle>
              <CardDescription>AI가 당신만의 맞춤형 학습 경로를 생성합니다</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="subject">주제</Label>
                  <Input id="subject" placeholder="예: 파이썬 프로그래밍, 미적분학, 영어 회화" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} required disabled={creating} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal">학습 목표</Label>
                  <textarea id="goal" className="w-full min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="무엇을 배우고 싶으신가요? 최대한 자세히 설명해주세요." value={formData.goal} onChange={(e) => setFormData({ ...formData, goal: e.target.value })} required disabled={creating} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">난이도</Label>
                    <select id="difficulty" className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.difficulty} onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })} disabled={creating}>
                      <option value="beginner">초급</option>
                      <option value="intermediate">중급</option>
                      <option value="advanced">고급</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aiModel">AI 모델</Label>
                    <select id="aiModel" className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.aiModel} onChange={(e) => setFormData({ ...formData, aiModel: e.target.value as any })} disabled={creating}>
                      <option value="openai">OpenAI GPT</option>
                      <option value="claude">Claude</option>
                      <option value="gemini">Gemini Pro</option>
                    </select>
                  </div>
                </div>
                <Button type="submit" className="w-full rounded-xl h-12 shadow-lg shadow-blue-500/25" disabled={creating}>
                  {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI가 커리큘럼을 생성 중입니다...</> : '커리큘럼 생성하기'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* List */}
        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-slate-500">커리큘럼을 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : curriculums.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                <GraduationCap className="w-10 h-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">아직 커리큘럼이 없습니다</h3>
              <p className="text-slate-500">첫 번째 커리큘럼을 만들고 학습을 시작하세요!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {curriculums.map((curriculum) => {
              const diff = difficultyConfig[curriculum.difficulty] || difficultyConfig.beginner;
              return (
                <Card key={curriculum._id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 group">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1 text-lg">{curriculum.title}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">{curriculum.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">{curriculum.subject}</span>
                      <span className={`text-xs px-2.5 py-1 ${diff.bg} ${diff.text} rounded-full font-medium`}>{diff.label}</span>
                      <span className="text-xs px-2.5 py-1 bg-violet-50 text-violet-600 rounded-full font-medium">{curriculum.aiModel}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-500">진행률</span>
                        <span className="font-medium text-slate-700">{curriculum.progress.overallPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${curriculum.progress.overallPercentage}%` }} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{curriculum.structure.length}개 모듈</span>
                      </div>
                      <span>{new Date(curriculum.createdAt).toLocaleDateString('ko-KR')}</span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1 rounded-xl group-hover:shadow-lg group-hover:shadow-blue-500/20 transition-shadow" size="sm" onClick={() => window.location.href = `/curriculums/${curriculum._id}`}>
                        학습 시작
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(curriculum._id)} className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                        <Trash2 className="w-4 h-4" />
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
