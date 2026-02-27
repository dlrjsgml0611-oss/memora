'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import {
  BookOpen,
  Target,
  Loader2,
  PartyPopper,
  Home,
  CheckCircle2,
  XCircle,
  Clock3,
  Lightbulb,
  TimerOff,
  Award,
  Gauge,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

type ErrorType = 'concept' | 'careless' | 'memory' | 'unknown';

const errorTypeOptions: Array<{ id: ErrorType; label: string }> = [
  { id: 'concept', label: '개념 부족' },
  { id: 'careless', label: '실수' },
  { id: 'memory', label: '기억 흐림' },
  { id: 'unknown', label: '기타' },
];

const ratingOptions = [
  { rating: 1 as const, emoji: '😢', label: 'Again', classes: 'border-red-200 hover:bg-red-50 hover:border-red-300' },
  { rating: 2 as const, emoji: '😕', label: 'Hard', classes: 'border-orange-200 hover:bg-orange-50 hover:border-orange-300' },
  { rating: 3 as const, emoji: '🙂', label: 'Good', classes: 'border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300' },
  { rating: 4 as const, emoji: '😄', label: 'Easy', classes: 'border-blue-200 hover:bg-blue-50 hover:border-blue-300' },
];

interface SessionConfig {
  mode: 'review' | 'exam';
  tagFilter?: string;
  conceptIdFilter?: string;
  maxCards: number;
}

export default function ReviewPage() {
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    mode: 'review',
    tagFilter: undefined,
    conceptIdFilter: undefined,
    maxCards: 30,
  });
  const { mode, tagFilter, conceptIdFilter, maxCards } = sessionConfig;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  const [sessionStartMs, setSessionStartMs] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [aiEvaluation, setAiEvaluation] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [errorType, setErrorType] = useState<ErrorType>('concept');
  const [summary, setSummary] = useState<any>(null);
  const [progress, setProgress] = useState({ reviewed: 0, total: 0, accuracy: 0 });
  const [timeoutHandled, setTimeoutHandled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const parsedMode = params.get('mode') === 'exam' ? 'exam' : 'review';
    const parsedTag = params.get('tag') || undefined;
    const parsedConceptId = params.get('conceptId') || undefined;
    const parsedCount = Number(params.get('count') || 30);
    const parsedMaxCards =
      Number.isFinite(parsedCount) && parsedCount > 0 ? Math.min(parsedCount, 100) : 30;

    setSessionConfig({
      mode: parsedMode,
      tagFilter: parsedTag,
      conceptIdFilter: parsedConceptId,
      maxCards: parsedMaxCards,
    });
  }, []);

  useEffect(() => {
    initializeSession();
  }, [mode, tagFilter, conceptIdFilter, maxCards]);

  useEffect(() => {
    if (!timeLimitMinutes || !sessionStartMs) {
      setRemainingSeconds(null);
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - sessionStartMs) / 1000);
      const remaining = Math.max(timeLimitMinutes * 60 - elapsed, 0);
      setRemainingSeconds(remaining);
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [timeLimitMinutes, sessionStartMs]);

  useEffect(() => {
    if (
      mode !== 'exam' ||
      timeoutHandled ||
      !sessionId ||
      loading ||
      remainingSeconds === null ||
      remainingSeconds > 0
    ) {
      return;
    }

    const handleTimeout = async () => {
      try {
        setTimeoutHandled(true);
        await api.completeReviewSession(sessionId, 'timeout');
        await fetchSummary(sessionId);
        setProgress((prev) => ({ ...prev, reviewed: prev.total }));
      } catch (error) {
        console.error('Failed to complete timed out session:', error);
      }
    };

    handleTimeout();
  }, [mode, timeoutHandled, sessionId, loading, remainingSeconds]);

  useEffect(() => {
    if (cards.length > 0 && currentIndex < cards.length) {
      setStartTime(Date.now());
    }
  }, [cards.length, currentIndex]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      setSummary(null);
      setShowAnswer(false);
      setShowHint(false);
      setUserAnswer('');
      setAiEvaluation(null);
      setCurrentIndex(0);
      setTimeoutHandled(false);
      const isFocusedDrill = Boolean(tagFilter || conceptIdFilter);
      const response: any =
        mode === 'exam'
          ? await api.createExamSession({
              count: maxCards,
              conceptId: conceptIdFilter,
              tag: tagFilter,
              timeLimitMinutes: 45,
            })
          : await api.createReviewSession({
              mode: 'review',
              source: isFocusedDrill ? 'manual' : 'today-mission',
              maxCards,
              maxNew: isFocusedDrill ? 0 : 10,
              weaknessBoost: 5,
              conceptId: conceptIdFilter,
              tag: tagFilter,
            });

      if (response.success) {
        setSessionId(response.data.session.id);
        setCards(response.data.cards || []);
        setTimeLimitMinutes(response.data.session.timeLimitMinutes || null);
        setSessionStartMs(Date.now());
        setProgress({
          reviewed: 0,
          total: response.data.session.totalCards || 0,
          accuracy: 0,
        });
      } else {
        setSessionId(null);
        setTimeLimitMinutes(null);
        setSessionStartMs(null);
        setRemainingSeconds(null);
        setCards([]);
        setProgress({ reviewed: 0, total: 0, accuracy: 0 });
      }
    } catch (error) {
      console.error('Failed to initialize review session:', error);
      setSessionId(null);
      setTimeLimitMinutes(null);
      setSessionStartMs(null);
      setRemainingSeconds(null);
      setCards([]);
      setProgress({ reviewed: 0, total: 0, accuracy: 0 });
    } finally {
      setLoading(false);
    }
  };

  const currentCard = cards[currentIndex];

  const isComplete = useMemo(() => {
    if (loading) return false;
    if (!sessionId) return true;
    if (progress.total === 0) return true;
    return progress.reviewed >= progress.total;
  }, [loading, progress.reviewed, progress.total, sessionId]);
  const isTimedOut = mode === 'exam' && remainingSeconds !== null && remainingSeconds <= 0;

  const fetchSummary = async (targetSessionId: string) => {
    try {
      const response: any = await api.getReviewSessionSummary(targetSessionId);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim() || !currentCard || isTimedOut) return;

    setEvaluating(true);
    setAiEvaluation(null);

    try {
      const response: any = await api.evaluateFlashcardAnswer({
        question: currentCard.front,
        correctAnswer: currentCard.back,
        userAnswer: userAnswer.trim(),
      });

      if (response.success) {
        setAiEvaluation(response.data.evaluation);
        setShowAnswer(true);
      } else {
        alert('평가 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to evaluate answer:', error);
      alert('평가 중 오류가 발생했습니다.');
    } finally {
      setEvaluating(false);
    }
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard || !sessionId || reviewing || isTimedOut) return;

    setReviewing(true);
    const responseTime = startTime ? Date.now() - startTime : 0;

    try {
      const response: any = await api.submitReviewSessionAnswer(sessionId, {
        flashcardId: currentCard._id,
        rating,
        responseTime,
        aiScore: aiEvaluation?.score,
        recommendedRating: aiEvaluation?.recommendedRating,
        errorType: rating <= 2 ? errorType : undefined,
      });

      if (response.success) {
        const session = response.data.session;
        setProgress({
          reviewed: session.reviewedCards,
          total: session.totalCards,
          accuracy: session.accuracy,
        });

        const nextCardId: string | null = response.data.nextCardId;

        if (nextCardId) {
          const nextIndex = cards.findIndex((card) => card._id === nextCardId);
          setCurrentIndex(nextIndex >= 0 ? nextIndex : currentIndex + 1);
          setShowAnswer(false);
          setShowHint(false);
          setUserAnswer('');
          setAiEvaluation(null);
          setErrorType('concept');
        } else {
          await api.completeReviewSession(sessionId, 'completed').catch(() => {});
          await fetchSummary(sessionId);
        }
      }
    } catch (error) {
      console.error('Failed to submit review answer:', error);
      alert('복습 저장에 실패했습니다.');
    } finally {
      setReviewing(false);
    }
  };

  const finishSessionEarly = async () => {
    if (!sessionId) return;

    try {
      await api.completeReviewSession(sessionId, mode === 'exam' ? 'user-exit' : 'abandoned');
      await fetchSummary(sessionId);
      setProgress((prev) => ({ ...prev, reviewed: prev.total }));
    } catch (error) {
      console.error('Failed to finish session early:', error);
      alert('세션 종료에 실패했습니다.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {mode === 'exam' ? '시험 모드' : '플래시카드 복습'}
          </h1>
          <p className="text-slate-500 mt-1">
            {mode === 'exam'
              ? '시간 제한 안에서 실전처럼 문제를 풀어보세요'
              : '세션 기반 복습으로 오늘 학습 목표를 달성하세요'}
          </p>
          {(tagFilter || conceptIdFilter) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tagFilter && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                  약점 태그: {tagFilter}
                </span>
              )}
              {conceptIdFilter && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                  개념 집중 학습
                </span>
              )}
            </div>
          )}
        </div>

        {mode === 'exam' && remainingSeconds !== null && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">남은 시간</p>
                <p className={`text-2xl font-bold ${remainingSeconds <= 300 ? 'text-red-600' : 'text-slate-800'}`}>
                  {Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:
                  {(remainingSeconds % 60).toString().padStart(2, '0')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">제한 {timeLimitMinutes}분</span>
                <Button size="sm" variant="outline" onClick={finishSessionEarly} className="rounded-lg">
                  <TimerOff className="w-4 h-4 mr-1" />
                  종료
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isTimedOut && (
          <Card className="border border-red-200 bg-red-50 shadow-none">
            <CardContent className="p-3 text-sm text-red-700">
              시간이 종료되었습니다. 세션 요약을 불러오는 중입니다.
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        {progress.total > 0 && !loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">진행률</span>
              <span className="font-medium text-slate-700">
                {progress.reviewed} / {progress.total} · 정확도 {progress.accuracy}%
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((progress.reviewed / Math.max(progress.total, 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {loading ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
              <p className="text-slate-500">복습 세션을 준비하는 중...</p>
            </CardContent>
          </Card>
        ) : isComplete ? (
          <Card className="border-0 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-10 text-white text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
                <PartyPopper className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold mb-2">세션 완료!</h2>
              <p className="text-emerald-100">
                {progress.total > 0 ? `총 ${progress.total}개 카드를 복습했습니다` : '복습할 카드가 없습니다'}
              </p>
            </div>

            {summary ? (
              <CardContent className="p-6 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SummaryBox icon={CheckCircle2} label="정답" value={summary.session.correctCount} color="emerald" />
                  <SummaryBox icon={XCircle} label="오답" value={summary.session.incorrectCount} color="orange" />
                  <SummaryBox icon={Target} label="정확도" value={`${summary.session.accuracy}%`} color="blue" />
                  <SummaryBox
                    icon={Clock3}
                    label="평균 응답"
                    value={`${Math.round((summary.session.avgResponseTime || 0) / 1000)}초`}
                    color="violet"
                  />
                </div>

                {summary.examReport && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <p className="text-sm text-rose-700">시험 리포트</p>
                        <p className="text-2xl font-bold text-slate-800 mt-0.5">
                          등급 {summary.examReport.grade} · {summary.examReport.score.toFixed(1)}점
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${
                          summary.examReport.pass
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        <Award className="w-4 h-4" />
                        {summary.examReport.pass ? '통과' : '보완 필요'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-lg border border-rose-200 bg-white p-3 text-center">
                        <p className="text-xs text-slate-500">속도 점수</p>
                        <p className="text-lg font-semibold text-slate-800">{summary.examReport.speedScore.toFixed(1)}</p>
                      </div>
                      <div className="rounded-lg border border-rose-200 bg-white p-3 text-center">
                        <p className="text-xs text-slate-500">일관성 점수</p>
                        <p className="text-lg font-semibold text-slate-800">{summary.examReport.consistencyScore.toFixed(1)}</p>
                      </div>
                      <div className="rounded-lg border border-rose-200 bg-white p-3 text-center">
                        <p className="text-xs text-slate-500">평균 응답</p>
                        <p className="text-lg font-semibold text-slate-800">{summary.examReport.avgResponseSeconds.toFixed(1)}초</p>
                      </div>
                    </div>

                    {summary.examReport.focusTopics?.length > 0 && (
                      <div className="text-sm text-rose-800">
                        집중 보강 추천: <strong>{summary.examReport.focusTopics.map((topic: any) => topic.topic).join(', ')}</strong>
                      </div>
                    )}
                  </div>
                )}

                {summary.topicBreakdown?.length > 0 && (
                  <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      토픽별 성과
                    </p>
                    {summary.topicBreakdown.slice(0, 5).map((topic: any, idx: number) => (
                      <div key={`${topic.topic}-${idx}`} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700">{topic.topic}</span>
                          <span className="text-slate-500">
                            숙련도 {topic.masteryRate.toFixed(1)}% · 정답률 {topic.accuracy.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${Math.min(topic.masteryRate, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {summary.weaknessTopics?.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900 mb-2">약점 주제</p>
                    <div className="flex flex-wrap gap-2">
                      {summary.weaknessTopics.map((topic: any, idx: number) => (
                        <span key={`${topic.topic}-${idx}`} className="px-2.5 py-1 rounded-full bg-white text-amber-700 text-xs border border-amber-200">
                          {topic.topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  내일 예상 복습량: <strong>{summary.nextDay?.dueCount || 0}개</strong>
                </div>

                {summary.recommendedActions?.length > 0 && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <p className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      다음 추천 액션
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {summary.recommendedActions.slice(0, 4).map((action: any, idx: number) => (
                        <Link key={`${action.type}-${idx}`} href={action.href}>
                          <div className="rounded-lg border border-indigo-200 bg-white p-3 hover:bg-indigo-50 transition-colors">
                            <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{action.description}</p>
                            <p className="text-xs text-indigo-600 mt-1 inline-flex items-center">
                              바로 이동
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button onClick={initializeSession} variant="outline" className="rounded-xl h-11">
                    <BookOpen className="w-4 h-4 mr-2" />
                    새 세션 시작
                  </Button>
                  <Button onClick={() => (window.location.href = '/dashboard')} className="rounded-xl h-11">
                    <Home className="w-4 h-4 mr-2" />
                    대시보드로 이동
                  </Button>
                </div>
              </CardContent>
            ) : (
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button onClick={initializeSession} variant="outline" className="rounded-xl h-11">
                  <BookOpen className="w-4 h-4 mr-2" />
                  새 세션 시작
                </Button>
                <Button onClick={() => (window.location.href = '/dashboard')} className="rounded-xl h-11">
                  <Home className="w-4 h-4 mr-2" />
                  대시보드로 이동
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
                  {currentCard.type === 'image' && '이미지 카드'}
                </CardTitle>
                <span className="text-sm text-gray-500">카드 {progress.reviewed + 1}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Question */}
              <div className="rounded-xl border-2 border-purple-200 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4">
                  <h3 className="text-lg font-bold text-white">
                    {currentCard.type === 'cloze' ? '빈칸 채우기' : '질문'}
                  </h3>
                </div>
                <div className="bg-white p-8">
                  <div className={`text-xl font-medium text-gray-900 whitespace-pre-wrap leading-relaxed ${
                    currentCard.type === 'code' ? 'font-mono bg-gray-50 p-5 rounded-lg' : ''
                  }`}>
                    {currentCard.type === 'cloze'
                      ? currentCard.front.replace(/\{\{(.*?)\}\}/g, '___________')
                      : currentCard.type === 'image'
                      ? currentCard.front.replace(/\[IMG\].*?\[\/IMG\]\n?/, '')
                      : currentCard.front}
                  </div>
                </div>
              </div>

              {!showAnswer && showHint && currentCard.hint && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  <p className="font-semibold mb-1">힌트</p>
                  <p className="text-sm leading-relaxed">{currentCard.hint}</p>
                </div>
              )}

              {!showAnswer && (
                <div className="rounded-xl border-2 border-indigo-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4">
                    <h3 className="text-lg font-bold text-white">답변 작성</h3>
                  </div>
                  <div className="bg-white p-6 space-y-4">
                    <textarea
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="생각나는 답변을 자유롭게 작성하세요"
                      className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 min-h-[140px]"
                      disabled={evaluating || isTimedOut}
                    />

                    <div className="flex flex-col sm:flex-row gap-3">
                      {currentCard.hint && !showHint && (
                        <Button
                          onClick={() => setShowHint(true)}
                          variant="outline"
                          size="lg"
                          className="border-amber-300 text-amber-700 hover:bg-amber-50"
                        >
                          <Lightbulb className="w-4 h-4 mr-2" />힌트 보기
                        </Button>
                      )}

                      <Button
                        onClick={handleSubmitAnswer}
                        size="lg"
                        disabled={!userAnswer.trim() || evaluating || isTimedOut}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500"
                      >
                        {evaluating ? 'AI 평가 중...' : 'AI 평가 받기'}
                      </Button>

                      <Button
                        onClick={() => setShowAnswer(true)}
                        size="lg"
                        variant="outline"
                        disabled={evaluating || isTimedOut}
                      >
                        정답 바로 보기
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {showAnswer && aiEvaluation && (
                <div className={`rounded-xl border-2 p-5 ${
                  aiEvaluation.isCorrect ? 'border-emerald-300 bg-emerald-50' : 'border-orange-300 bg-orange-50'
                }`}>
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <p className="text-lg font-bold text-gray-900">AI 평가</p>
                    <span className="px-2.5 py-1 rounded-full bg-white text-sm border border-slate-200">
                      점수 {aiEvaluation.score}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-white text-sm border border-slate-200">
                      추천 난이도 {aiEvaluation.recommendedRating}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{aiEvaluation.feedback}</p>
                </div>
              )}

              {showAnswer && (
                <div className="rounded-xl border-2 border-blue-300 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4">
                    <h3 className="text-lg font-bold text-white">정답</h3>
                  </div>
                  <div className="bg-white p-6">
                    {currentCard.type === 'code' ? (
                      <pre className="bg-gray-900 text-gray-100 p-5 rounded-lg overflow-x-auto text-sm font-mono leading-relaxed">
                        <code>{currentCard.back}</code>
                      </pre>
                    ) : (
                      <div className="text-lg text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {currentCard.back}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {showAnswer && (
                <div className="pt-6 border-t border-slate-100 space-y-4">
                  {aiEvaluation?.recommendedRating && (
                    <div className="text-center text-sm text-slate-600">
                      AI 추천 난이도: <span className="font-semibold">{aiEvaluation.recommendedRating}</span>
                    </div>
                  )}

                  {aiEvaluation && !aiEvaluation.isCorrect && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">오답 원인을 선택하면 약점 분석 정확도가 높아집니다</p>
                      <div className="flex flex-wrap gap-2">
                        {errorTypeOptions.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setErrorType(item.id)}
                            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                              errorType === item.id
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {ratingOptions.map((option) => {
                      const isRecommended = aiEvaluation?.recommendedRating === option.rating;
                      return (
                        <Button
                          key={option.rating}
                          variant="outline"
                          className={`h-20 flex flex-col rounded-xl border-2 ${option.classes} ${
                            isRecommended ? 'ring-2 ring-blue-400 bg-blue-50' : ''
                          }`}
                          onClick={() => handleRating(option.rating)}
                          disabled={reviewing || isTimedOut}
                        >
                          <span className="text-2xl mb-1">{option.emoji}</span>
                          <span className="text-sm font-medium">{option.label}</span>
                        </Button>
                      );
                    })}
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

function SummaryBox({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: 'emerald' | 'orange' | 'blue' | 'violet';
}) {
  const tone = {
    emerald: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-orange-50 text-orange-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
  }[color];

  return (
    <div className={`rounded-xl p-4 text-center ${tone}`}>
      <Icon className="w-5 h-5 mx-auto mb-1" />
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}
