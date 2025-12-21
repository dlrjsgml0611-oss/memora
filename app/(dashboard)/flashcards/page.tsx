'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateFlashcardModal from '@/components/flashcard/CreateFlashcardModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { Plus, Trash2, Layers, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export default function FlashcardsPage() {
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadFlashcards();
  }, [page]);

  const loadFlashcards = async () => {
    try {
      const response: any = await api.getFlashcards({ page, limit: 20 });
      if (response.success) {
        setFlashcards(response.data || []);
        if (response.pagination) setTotalPages(response.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    const response: any = await api.createFlashcard(data);
    if (response.success) setFlashcards([response.data, ...flashcards]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await api.deleteFlashcard(id);
      setFlashcards(flashcards.filter((card) => card._id !== id));
    } catch (error) {
      alert('삭제에 실패했습니다');
    }
  };

  const stateConfig: Record<string, { bg: string; text: string; label: string }> = {
    new: { bg: 'bg-blue-50', text: 'text-blue-600', label: '새 카드' },
    learning: { bg: 'bg-amber-50', text: 'text-amber-600', label: '학습 중' },
    review: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: '복습' },
    relearning: { bg: 'bg-orange-50', text: 'text-orange-600', label: '재학습' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">플래시카드</h1>
            <p className="text-slate-500 mt-1">내 플래시카드를 관리하세요</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="rounded-xl shadow-lg shadow-blue-500/25">
            <Plus className="w-4 h-4 mr-2" />
            새 플래시카드
          </Button>
        </div>

        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-slate-500">플래시카드를 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : flashcards.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <Layers className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">아직 플래시카드가 없습니다</h3>
              <p className="text-slate-500">첫 번째 플래시카드를 만들고 학습을 시작하세요!</p>
              <Button onClick={() => setShowCreateModal(true)} className="rounded-xl">
                플래시카드 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {flashcards.map((card) => {
                const state = stateConfig[card.srs.state] || stateConfig.new;
                return (
                  <Card key={card._id} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex gap-2 mb-3">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${state.bg} ${state.text}`}>
                              {state.label}
                            </span>
                            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full font-medium">
                              {card.type}
                            </span>
                          </div>
                          <CardTitle className="text-lg">{card.front}</CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {card.type === 'cloze' && (
                        <div className="p-4 rounded-xl bg-slate-50">
                          <p className="text-sm text-slate-500 mb-1">빈칸 문제</p>
                          <p className="text-slate-700">{card.front.replace(/\{\{(.*?)\}\}/g, '___________')}</p>
                        </div>
                      )}

                      <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/30">
                        <p className="text-sm text-slate-500 mb-1">답변</p>
                        {card.type === 'code' ? (
                          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl overflow-x-auto text-sm font-mono">
                            <code>{card.back}</code>
                          </pre>
                        ) : (
                          <p className="text-slate-700 whitespace-pre-wrap">{card.back}</p>
                        )}
                      </div>

                      {card.hint && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                          <p className="text-sm text-amber-700">💡 {card.hint}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                        {[
                          { label: '복습 횟수', value: card.stats.totalReviews },
                          { label: '정답률', value: `${card.stats.totalReviews > 0 ? Math.round((card.stats.correctCount / card.stats.totalReviews) * 100) : 0}%`, color: 'text-emerald-600' },
                          { label: '난이도', value: card.srs.ease.toFixed(1) },
                          { label: '다음 복습', value: new Date(card.srs.nextReview) <= new Date() ? '지금' : new Date(card.srs.nextReview).toLocaleDateString('ko-KR') },
                        ].map((stat, i) => (
                          <div key={i}>
                            <p className="text-xs text-slate-400 mb-0.5">{stat.label}</p>
                            <p className={`text-lg font-semibold ${stat.color || 'text-slate-700'}`}>{stat.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleDelete(card._id)} className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                          <Trash2 className="w-4 h-4 mr-1" />
                          삭제
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-4">
                <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page === 1} className="rounded-xl">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="px-4 py-2 text-sm text-slate-600 font-medium">{page} / {totalPages}</span>
                <Button variant="outline" onClick={() => setPage(page + 1)} disabled={page === totalPages} className="rounded-xl">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateFlashcardModal onClose={() => setShowCreateModal(false)} onSubmit={handleCreate} />
      )}
    </DashboardLayout>
  );
}
