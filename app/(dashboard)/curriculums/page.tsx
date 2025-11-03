'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';

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
      if (response.success) {
        setCurriculums(response.data || []);
      }
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
        setFormData({
          goal: '',
          subject: '',
          difficulty: 'beginner',
          aiModel: 'openai',
        });
      }
    } catch (error: any) {
      alert(error.message || '커리큘럼 생성에 실패했습니다');
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">커리큘럼</h1>
            <p className="text-gray-600 mt-2">AI가 생성한 맞춤형 학습 경로</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? '취소' : '+ 새 커리큘럼'}
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <Card>
            <CardHeader>
              <CardTitle>새 커리큘럼 만들기</CardTitle>
              <CardDescription>
                AI가 당신만의 맞춤형 학습 경로를 생성합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">주제</Label>
                  <Input
                    id="subject"
                    placeholder="예: 파이썬 프로그래밍, 미적분학, 영어 회화"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal">학습 목표</Label>
                  <textarea
                    id="goal"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="무엇을 배우고 싶으신가요? 최대한 자세히 설명해주세요."
                    value={formData.goal}
                    onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                    required
                    disabled={creating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="difficulty">난이도</Label>
                    <select
                      id="difficulty"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
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
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.aiModel}
                      onChange={(e) => setFormData({ ...formData, aiModel: e.target.value as any })}
                      disabled={creating}
                    >
                      <option value="openai">OpenAI</option>
                      <option value="claude">Claude</option>
                      <option value="gemini">Gemini</option>
                    </select>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? 'AI가 커리큘럼을 생성 중입니다...' : '커리큘럼 생성하기'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Curriculums List */}
        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">커리큘럼을 불러오는 중...</div>
            </CardContent>
          </Card>
        ) : curriculums.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900">
                아직 커리큘럼이 없습니다
              </h3>
              <p className="text-gray-600">
                첫 번째 커리큘럼을 만들고 학습을 시작하세요!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {curriculums.map((curriculum) => (
              <Card key={curriculum._id} className="hover:shadow-lg transition">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="line-clamp-1">{curriculum.title}</CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">
                        {curriculum.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {curriculum.subject}
                    </span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {curriculum.difficulty === 'beginner' && '초급'}
                      {curriculum.difficulty === 'intermediate' && '중급'}
                      {curriculum.difficulty === 'advanced' && '고급'}
                    </span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      {curriculum.aiModel}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 mb-2">진행률</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${curriculum.progress.overallPercentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {curriculum.progress.overallPercentage}% 완료
                    </div>
                  </div>

                  <div className="text-sm text-gray-600">
                    <div className="font-semibold mb-1">모듈 수: {curriculum.structure.length}개</div>
                    <div className="text-xs text-gray-500">
                      생성일: {new Date(curriculum.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      size="sm"
                      onClick={() => window.location.href = `/curriculums/${curriculum._id}`}
                    >
                      학습 시작
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(curriculum._id)}
                    >
                      삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
