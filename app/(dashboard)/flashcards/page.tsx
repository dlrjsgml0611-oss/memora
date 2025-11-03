'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateFlashcardModal from '@/components/flashcard/CreateFlashcardModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

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
        if (response.pagination) {
          setTotalPages(response.pagination.pages);
        }
      }
    } catch (error) {
      console.error('Failed to load flashcards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: any) => {
    const response: any = await api.createFlashcard(data);
    if (response.success) {
      setFlashcards([response.data, ...flashcards]);
    }
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

  const getStateColor = (state: string) => {
    switch (state) {
      case 'new':
        return 'bg-blue-100 text-blue-700';
      case 'learning':
        return 'bg-yellow-100 text-yellow-700';
      case 'review':
        return 'bg-green-100 text-green-700';
      case 'relearning':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStateName = (state: string) => {
    switch (state) {
      case 'new':
        return '새 카드';
      case 'learning':
        return '학습 중';
      case 'review':
        return '복습';
      case 'relearning':
        return '재학습';
      default:
        return state;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">플래시카드</h1>
            <p className="text-gray-600 mt-2">내 플래시카드를 관리하세요</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + 새 플래시카드
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">플래시카드를 불러오는 중...</div>
            </CardContent>
          </Card>
        ) : flashcards.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-900">
                아직 플래시카드가 없습니다
              </h3>
              <p className="text-gray-600">
                첫 번째 플래시카드를 만들고 학습을 시작하세요!
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                플래시카드 만들기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {flashcards.map((card) => (
                <Card key={card._id} className="hover:shadow-md transition">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded ${getStateColor(card.srs.state)}`}>
                            {getStateName(card.srs.state)}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {card.type}
                          </span>
                        </div>
                        <CardTitle className="text-lg">{card.front}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">답변</div>
                      <p className="text-gray-800 whitespace-pre-wrap">{card.back}</p>
                    </div>

                    {card.hint && (
                      <div>
                        <div className="text-sm text-gray-600 mb-1">힌트</div>
                        <p className="text-gray-600 text-sm">{card.hint}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                      <div>
                        <div className="text-xs text-gray-500">복습 횟수</div>
                        <div className="text-lg font-semibold">{card.stats.totalReviews}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">정답률</div>
                        <div className="text-lg font-semibold text-green-600">
                          {card.stats.totalReviews > 0
                            ? Math.round((card.stats.correctCount / card.stats.totalReviews) * 100)
                            : 0}%
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">난이도</div>
                        <div className="text-lg font-semibold">
                          {card.srs.ease.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">다음 복습</div>
                        <div className="text-sm font-semibold">
                          {new Date(card.srs.nextReview) <= new Date()
                            ? '지금'
                            : new Date(card.srs.nextReview).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(card._id)}
                      >
                        삭제
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  이전
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  다음
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <CreateFlashcardModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </DashboardLayout>
  );
}
