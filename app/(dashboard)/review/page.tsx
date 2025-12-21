'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { BookOpen, Target, Loader2, PartyPopper, Home, CheckCircle2, XCircle } from 'lucide-react';

export default function ReviewPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });
  const [startTime, setStartTime] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [aiEvaluation, setAiEvaluation] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    loadDueCards();
  }, []);

  useEffect(() => {
    // Start timer when card is displayed
    if (cards.length > 0 && currentIndex < cards.length) {
      setStartTime(Date.now());
    }
  }, [currentIndex, cards.length]);

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
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !currentCard) return;

    setEvaluating(true);
    setAiEvaluation(null);

    try {
      const response = await fetch('/api/flashcards/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage')!).state.token : ''}`,
        },
        body: JSON.stringify({
          question: currentCard.front,
          correctAnswer: currentCard.back,
          userAnswer: userAnswer.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        setAiEvaluation(result.data.evaluation);
        setShowAnswer(true);
      } else {
        alert('평가 중 오류가 발생했습니다: ' + result.error);
      }
    } catch (error) {
      console.error('Failed to evaluate answer:', error);
      alert('평가 중 오류가 발생했습니다.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    if (!cards[currentIndex] || reviewing) return;

    setReviewing(true);
    const responseTime = startTime ? Date.now() - startTime : 0;

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
        setShowHint(false);
        setUserAnswer('');
        setAiEvaluation(null);
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
          <h1 className="text-3xl font-bold text-slate-800">플래시카드 복습</h1>
          <p className="text-slate-500 mt-1">오늘의 복습 카드를 학습하세요</p>
        </div>

        {/* Progress Bar */}
        {cards.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">진행률</span>
              <span className="font-medium text-slate-700">{currentIndex + 1} / {cards.length}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Session Stats */}
        {sessionStats.total > 0 && (
          <div className="flex gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl">
              <Target className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700 font-medium">정확도: {accuracy}%</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-blue-700 font-medium">복습: {sessionStats.total}개</span>
            </div>
          </div>
        )}

        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-slate-500">카드를 불러오는 중...</p>
            </CardContent>
          </Card>
        ) : isComplete ? (
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-10 text-white text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                <PartyPopper className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold mb-2">복습 완료!</h2>
              <p className="text-emerald-100">
                {sessionStats.total > 0
                  ? `오늘 ${sessionStats.total}개의 카드를 복습했습니다`
                  : '복습할 카드가 없습니다'}
              </p>
            </div>
            {sessionStats.total > 0 && (
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-4 rounded-xl bg-emerald-50">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-800">{sessionStats.correct}</div>
                    <p className="text-sm text-slate-500">정답</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-slate-50">
                    <XCircle className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-800">{sessionStats.total - sessionStats.correct}</div>
                    <p className="text-sm text-slate-500">오답</p>
                  </div>
                </div>
                <Button onClick={() => window.location.href = '/dashboard'} className="w-full rounded-xl h-12">
                  <Home className="w-4 h-4 mr-2" />
                  대시보드로 돌아가기
                </Button>
              </CardContent>
            )}
          </Card>
        ) : currentCard ? (
          <Card className="min-h-[400px] border-0 shadow-lg">
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
              <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">❓</span>
                    <h3 className="text-lg font-bold text-white">
                      {currentCard.type === 'cloze' ? '빈칸 채우기' : '질문'}
                    </h3>
                  </div>
                </div>
                <div className="bg-white p-8">
                  {/* Image card with image */}
                  {currentCard.type === 'image' && currentCard.front.includes('[IMG]') && (
                    <div className="mb-6">
                      <img
                        src={currentCard.front.match(/\[IMG\](.*?)\[\/IMG\]/)?.[1] || ''}
                        alt="Question"
                        className="max-w-full h-64 object-contain rounded-lg border-2 border-gray-200 mx-auto shadow-sm"
                        onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                      />
                    </div>
                  )}

                  <div className={`text-xl font-medium text-gray-900 whitespace-pre-wrap leading-relaxed ${
                    currentCard.type === 'code' ? 'font-mono bg-gray-50 p-5 rounded-lg' : ''
                  }`}>
                    {currentCard.type === 'cloze'
                      ? currentCard.front.replace(/\{\{(.*?)\}\}/g, '___________')
                      : currentCard.type === 'image'
                      ? currentCard.front.replace(/\[IMG\].*?\[\/IMG\]\n?/, '')
                      : currentCard.front
                    }
                  </div>
                </div>
              </div>

              {/* Hint Section */}
              {!showAnswer && showHint && currentCard.hint && (
                <div className="rounded-xl border-2 border-yellow-300 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-gradient-to-r from-yellow-400 to-amber-400 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💡</span>
                      <h3 className="text-lg font-bold text-gray-900">힌트</h3>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-6">
                    <div className="text-gray-800 leading-relaxed text-base">{currentCard.hint}</div>
                  </div>
                </div>
              )}

              {/* Answer Input Section */}
              {!showAnswer && (
                <div className="rounded-xl border-2 border-indigo-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">✍️</span>
                      <h3 className="text-lg font-bold text-white">답변 작성</h3>
                    </div>
                  </div>
                  <div className="bg-white p-6 space-y-4">
                    <div className="space-y-3">
                      <label htmlFor="userAnswer" className="block text-base font-semibold text-gray-800">
                        💭 생각나는 대로 답변을 작성해보세요
                      </label>
                      <textarea
                        id="userAnswer"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="여기에 답변을 입력하세요...&#10;&#10;💡 팁: 자세할수록 더 정확한 피드백을 받을 수 있습니다!"
                        className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 min-h-[140px] leading-relaxed text-base transition-all"
                        disabled={evaluating}
                      />
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <span>📝</span>
                        <span>입력한 글자 수: {userAnswer.length}자</span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {currentCard.hint && !showHint && (
                        <Button
                          onClick={() => setShowHint(true)}
                          variant="outline"
                          size="lg"
                          className="border-2 border-yellow-400 text-yellow-700 hover:bg-yellow-50 font-semibold"
                        >
                          💡 힌트 보기
                        </Button>
                      )}
                      <Button
                        onClick={handleSubmitAnswer}
                        size="lg"
                        disabled={!userAnswer.trim() || evaluating}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {evaluating ? (
                          <>
                            <span className="animate-spin mr-2">⏳</span>
                            AI가 평가 중...
                          </>
                        ) : (
                          <>
                            <span className="mr-2">🤖</span>
                            AI 평가 받기
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleShowAnswer}
                        size="lg"
                        variant="outline"
                        disabled={evaluating}
                        className="border-2 border-gray-300 hover:bg-gray-50 font-semibold"
                      >
                        💡 답변만 보기
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Evaluation */}
              {showAnswer && aiEvaluation && (
                <div className={`rounded-xl border-2 overflow-hidden ${
                  aiEvaluation.isCorrect ? 'border-green-400' : 'border-orange-400'
                }`}>
                  {/* Header */}
                  <div className={`p-5 ${
                    aiEvaluation.isCorrect ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-orange-500 to-amber-500'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {aiEvaluation.isCorrect ? '✅' : '📝'}
                        </span>
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            AI 평가 결과
                          </h3>
                          <p className="text-sm text-white/90">
                            {aiEvaluation.isCorrect ? '정답입니다!' : '아쉽지만 다시 한번 확인해보세요'}
                          </p>
                        </div>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm px-5 py-3 rounded-full">
                        <span className="text-2xl font-bold text-white">
                          {aiEvaluation.score}점
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="bg-white p-6 space-y-5">
                    {/* Your Answer */}
                    <div className="bg-gray-50 rounded-lg p-5 border-l-4 border-blue-400">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">📝</span>
                        <h4 className="font-bold text-gray-900 text-base">당신의 답변</h4>
                      </div>
                      <div className="text-gray-900 whitespace-pre-wrap leading-relaxed text-base pl-7">
                        {userAnswer}
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="bg-blue-50 rounded-lg p-5 border-l-4 border-blue-500">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">💬</span>
                        <h4 className="font-bold text-gray-900 text-base">AI 피드백</h4>
                      </div>
                      <p className="text-gray-800 leading-relaxed text-base pl-7">
                        {aiEvaluation.feedback}
                      </p>
                    </div>

                    {/* Strengths and Improvements Grid */}
                    <div className="grid md:grid-cols-2 gap-5">
                      {/* Strengths */}
                      {aiEvaluation.strengths && aiEvaluation.strengths.length > 0 && (
                        <div className="bg-green-50 rounded-lg p-5 border-l-4 border-green-500">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">👍</span>
                            <h4 className="font-bold text-green-900 text-base">잘한 점</h4>
                          </div>
                          <ul className="space-y-2 pl-7">
                            {aiEvaluation.strengths.map((strength: string, idx: number) => (
                              <li key={idx} className="text-gray-800 leading-relaxed flex items-start">
                                <span className="text-green-500 mr-2 mt-1">•</span>
                                <span className="flex-1">{strength}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvements */}
                      {aiEvaluation.improvements && aiEvaluation.improvements.length > 0 && (
                        <div className="bg-orange-50 rounded-lg p-5 border-l-4 border-orange-500">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">📈</span>
                            <h4 className="font-bold text-orange-900 text-base">개선할 점</h4>
                          </div>
                          <ul className="space-y-2 pl-7">
                            {aiEvaluation.improvements.map((improvement: string, idx: number) => (
                              <li key={idx} className="text-gray-800 leading-relaxed flex items-start">
                                <span className="text-orange-500 mr-2 mt-1">•</span>
                                <span className="flex-1">{improvement}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Answer */}
              {showAnswer ? (
                <div className="rounded-xl border-2 border-blue-300 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💡</span>
                      <h3 className="text-lg font-bold text-white">정답</h3>
                    </div>
                  </div>
                  <div className="bg-white p-6">
                    {currentCard.type === 'code' ? (
                      <pre className="bg-gray-900 text-gray-100 p-5 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
                        <code>{currentCard.back}</code>
                      </pre>
                    ) : currentCard.type === 'cloze' ? (
                      <div>
                        <div className="text-lg text-gray-900 whitespace-pre-wrap leading-relaxed mb-4">
                          {currentCard.back}
                        </div>
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">✓</span>
                            <span className="font-bold text-green-900">정답:</span>
                            <span className="text-green-700 font-semibold">
                              {currentCard.front.match(/\{\{(.*?)\}\}/g)?.map((m: string) => m.replace(/[{}]/g, '')).join(', ') || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-lg text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {currentCard.back}
                      </div>
                    )}
                    {currentCard.hint && (
                      <div className="mt-5 pt-5 border-t border-gray-200">
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">💡</span>
                            <h4 className="font-bold text-yellow-900">힌트</h4>
                          </div>
                          <div className="text-gray-800 leading-relaxed pl-7">{currentCard.hint}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Rating Buttons */}
              {showAnswer && (
                <div className="pt-6 border-t border-slate-100">
                  <div className="text-sm text-slate-500 mb-4 text-center font-medium">
                    얼마나 잘 기억했나요?
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { rating: 1, emoji: '😢', label: '전혀', color: 'red' },
                      { rating: 2, emoji: '😕', label: '어려움', color: 'orange' },
                      { rating: 3, emoji: '😊', label: '좋음', color: 'emerald' },
                      { rating: 4, emoji: '😄', label: '쉬움', color: 'blue' },
                    ].map(({ rating, emoji, label, color }) => (
                      <Button
                        key={rating}
                        variant="outline"
                        className={`h-20 flex flex-col rounded-xl border-2 border-${color}-200 hover:bg-${color}-50 hover:border-${color}-300 transition-all`}
                        onClick={() => handleRating(rating as 1 | 2 | 3 | 4)}
                        disabled={reviewing}
                      >
                        <span className="text-2xl mb-1">{emoji}</span>
                        <span className="text-sm font-medium">{label}</span>
                      </Button>
                    ))}
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
