'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import {
  AlertTriangle,
  Loader2,
  Target,
  ArrowRight,
  Swords,
  Trophy,
  CheckCircle2,
  Gauge,
} from 'lucide-react';

interface WeaknessTopic {
  topic: string;
  weakCount: number;
  totalReviews: number;
  correctReviews: number;
  avgRating: number;
  accuracy: number;
  masteryRate: number;
  goalTarget: number;
  goalProgress: number;
  goalRemaining: number;
  achieved: boolean;
}

interface WeaknessGoal {
  targetReviewsPerTopic: number;
  trackedTopics: number;
  masteredTopics: number;
  progressRate: number;
}

export default function WeaknessPage() {
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(14);
  const [topics, setTopics] = useState<WeaknessTopic[]>([]);
  const [goal, setGoal] = useState<WeaknessGoal | null>(null);

  useEffect(() => {
    loadTopics(periodDays);
  }, [periodDays]);

  const loadTopics = async (days: number) => {
    try {
      setLoading(true);
      const response: any = await api.getWeaknessTopics(days);
      if (response.success) {
        setTopics(response.data.topics || []);
        setGoal(response.data.goal || null);
      }
    } catch (error) {
      console.error('Failed to load weakness topics:', error);
      setTopics([]);
      setGoal(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">약점 훈련</h1>
          <p className="text-slate-500 mt-1">오답 패턴을 기반으로 약한 주제를 집중 훈련합니다</p>
        </div>

        {goal && (
          <Card className="border-0 shadow-lg bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <p className="font-semibold text-slate-800">약점 훈련 목표</p>
                </div>
                <p className="text-sm text-slate-600">
                  달성 {goal.masteredTopics} / {goal.trackedTopics || 0}
                </p>
              </div>
              <div className="w-full h-2.5 rounded-full bg-amber-100 overflow-hidden">
                <div
                  className="h-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                  style={{ width: `${goal.progressRate}%` }}
                />
              </div>
              <p className="text-sm text-slate-600">
                토픽당 권장 복습량 <strong>{goal.targetReviewsPerTopic}회</strong> · 현재 평균 진행률{' '}
                <strong>{goal.progressRate}%</strong>
              </p>
            </CardContent>
          </Card>
        )}

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              최근 약점 주제
            </CardTitle>
            <CardDescription>
              기간 내 Again/Hard 응답을 기준으로 집계됩니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              {[7, 14, 30].map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant={periodDays === days ? 'default' : 'outline'}
                  onClick={() => setPeriodDays(days)}
                  className="rounded-full"
                >
                  {days}일
                </Button>
              ))}
            </div>

            {loading ? (
              <div className="py-10 flex flex-col items-center text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                집계 중...
              </div>
            ) : topics.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                최근 기간에 약점 주제가 없습니다. 계속 학습을 이어가세요.
              </div>
            ) : (
              <div className="space-y-3">
                {topics.map((topic, index) => (
                  <div
                    key={`${topic.topic}-${index}`}
                    className="rounded-xl border border-slate-200 p-4 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-800">{topic.topic}</p>
                          {topic.achieved && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-xs border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              목표 달성
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          취약 응답 {topic.weakCount}회 · 정답률 {topic.accuracy.toFixed(1)}% · 평균 평점 {topic.avgRating.toFixed(1)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/review?tag=${encodeURIComponent(topic.topic)}&count=20`}>
                          <Button size="sm" className="rounded-lg">
                            <Target className="w-4 h-4 mr-1" />
                            집중 훈련
                          </Button>
                        </Link>
                        <Link href={`/review?mode=exam&tag=${encodeURIComponent(topic.topic)}&count=20`}>
                          <Button size="sm" variant="outline" className="rounded-lg">
                            <Swords className="w-4 h-4 mr-1" />
                            시험 모드
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>훈련 목표 진행률</span>
                        <span>
                          {topic.totalReviews}/{topic.goalTarget} · {topic.goalProgress}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${topic.goalProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="rounded-lg border border-slate-200 p-2 text-center">
                        <p className="text-xs text-slate-500">남은 목표</p>
                        <p className="font-semibold text-slate-700">{topic.goalRemaining}회</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-2 text-center">
                        <p className="text-xs text-slate-500">숙련도</p>
                        <p className="font-semibold text-slate-700">{topic.masteryRate.toFixed(1)}%</p>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-2 text-center">
                        <p className="text-xs text-slate-500">총 복습</p>
                        <p className="font-semibold text-slate-700">{topic.totalReviews}회</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-5 flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-800">전체 복습으로 돌아가기</p>
              <p className="text-sm text-slate-500 mt-0.5">
                약점 훈련 후 일반 세션 또는 시험 모드로 학습 루프를 완성해보세요
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/review">
                <Button variant="outline" className="rounded-xl">
                  복습 시작
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/review?mode=exam&count=20">
                <Button className="rounded-xl">
                  <Gauge className="w-4 h-4 mr-1" />
                  시험 도전
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
