'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

export default function ReviewPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    loadDueCards();
  }, []);

  const loadDueCards = async () => {
    try {
      const response: any = await api.getDueFlashcards(true, 10);
      if (response.success) {
        setCards(response.data.cards || []);
      }
    } catch (error) {
      console.error('Failed to load due cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setStartTime(Date.now());
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    if (!cards[currentIndex] || reviewing) return;

    setReviewing(true);
    const responseTime = Date.now() - startTime;

    try {
      await api.submitReview(cards[currentIndex]._id, rating, responseTime);

      // Update stats
      setSessionStats({
        correct: sessionStats.correct + (rating >= 3 ? 1 : 0),
        total: sessionStats.total + 1,
      });

      // Move to next card
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        // Session complete
        setCards([]);
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setReviewing(false);
    }
  };

  const currentCard = cards[currentIndex];
  const isComplete = cards.length === 0 && !loading;
  const accuracy = sessionStats.total > 0
    ? Math.round((sessionStats.correct / sessionStats.total) * 100)
    : 0;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">플래시카드 복습</h1>
          <p className="text-gray-600 mt-2">오늘의 복습 카드를 학습하세요</p>
        </div>

        {/* Progress Bar */}
        {cards.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>진행률</span>
              <span>{currentIndex + 1} / {cards.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Session Stats */}
        {sessionStats.total > 0 && (
          <div className="flex gap-4">
            <div className="bg-green-50 border border-green-200 px-4 py-2 rounded-lg">
              <span className="text-green-700 font-semibold">
                정확도: {accuracy}%
              </span>
            </div>
            <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
              <span className="text-blue-700 font-semibold">
                복습한 카드: {sessionStats.total}개
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-gray-500">카드를 불러오는 중...</div>
            </CardContent>
          </Card>
        ) : isComplete ? (
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="p-12 text-center space-y-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900">복습 완료!</h2>
              <p className="text-gray-600">
                {sessionStats.total > 0
                  ? `오늘 ${sessionStats.total}개의 카드를 복습했습니다. 정확도: ${accuracy}%`
                  : '복습할 카드가 없습니다.'}
              </p>
              <div className="pt-4">
                <Button onClick={() => window.location.href = '/dashboard'}>
                  대시보드로 돌아가기
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : currentCard ? (
          <Card className="min-h-[400px]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>
                  {currentCard.type === 'basic' && '기본 카드'}
                  {currentCard.type === 'cloze' && 'Cloze 카드'}
                  {currentCard.type === 'code' && '코드 카드'}
                </CardTitle>
                <span className="text-sm text-gray-500">
                  카드 {currentIndex + 1}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question */}
              <div className="bg-gray-50 p-8 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-2">질문</div>
                <div className="text-xl font-medium text-gray-900 whitespace-pre-wrap">
                  {currentCard.front}
                </div>
              </div>

              {/* Answer */}
              {showAnswer ? (
                <div className="bg-blue-50 p-8 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-600 mb-2">답변</div>
                  <div className="text-xl text-gray-900 whitespace-pre-wrap">
                    {currentCard.back}
                  </div>
                  {currentCard.hint && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="text-sm text-blue-600">힌트</div>
                      <div className="text-gray-700">{currentCard.hint}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <Button onClick={handleShowAnswer} size="lg">
                    답변 확인하기
                  </Button>
                </div>
              )}

              {/* Rating Buttons */}
              {showAnswer && (
                <div className="pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600 mb-4 text-center">
                    얼마나 잘 기억했나요?
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col border-red-200 hover:bg-red-50"
                      onClick={() => handleRating(1)}
                      disabled={reviewing}
                    >
                      <span className="text-2xl mb-1">😢</span>
                      <span className="text-sm">전혀</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col border-orange-200 hover:bg-orange-50"
                      onClick={() => handleRating(2)}
                      disabled={reviewing}
                    >
                      <span className="text-2xl mb-1">😕</span>
                      <span className="text-sm">어려움</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col border-green-200 hover:bg-green-50"
                      onClick={() => handleRating(3)}
                      disabled={reviewing}
                    >
                      <span className="text-2xl mb-1">😊</span>
                      <span className="text-sm">좋음</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-20 flex flex-col border-blue-200 hover:bg-blue-50"
                      onClick={() => handleRating(4)}
                      disabled={reviewing}
                    >
                      <span className="text-2xl mb-1">😄</span>
                      <span className="text-sm">쉬움</span>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
