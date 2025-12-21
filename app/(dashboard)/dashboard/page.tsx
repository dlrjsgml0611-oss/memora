'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import {
  BookOpen, GraduationCap, Brain, Flame, Clock, TrendingUp,
  Sparkles, ArrowRight, Lightbulb, Target, Zap
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [dueCards, setDueCards] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [userResponse, dueCardsResponse] = await Promise.all([
        api.getMe(),
        api.getDueFlashcards(false, 0),
      ]);
      if (userResponse.success) setStats(userResponse.data.stats);
      if (dueCardsResponse.success) setDueCards(dueCardsResponse.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요';
    if (hour < 18) return '좋은 오후예요';
    return '좋은 저녁이에요';
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white">
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="relative z-10">
            <p className="text-blue-100 mb-1">{getGreeting()}</p>
            <h1 className="text-3xl font-bold mb-2">{user?.username}님, 오늘도 화이팅! 🎯</h1>
            <p className="text-blue-100 max-w-xl">
              {dueCards?.dueCount > 0
                ? `오늘 복습할 카드가 ${dueCards.dueCount}개 있어요. 꾸준한 학습이 기억력 향상의 비결이에요!`
                : '모든 복습을 완료했어요! 새로운 학습을 시작해보세요.'}
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute right-20 top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="복습 대기"
            value={dueCards?.dueCount || 0}
            icon={BookOpen}
            gradient="from-blue-500 to-cyan-400"
            loading={loading}
          />
          <StatCard
            title="학습한 카드"
            value={stats?.cardsReviewed || 0}
            icon={Target}
            gradient="from-emerald-500 to-teal-400"
            loading={loading}
          />
          <StatCard
            title="현재 스트릭"
            value={stats?.currentStreak || 0}
            icon={Flame}
            gradient="from-orange-500 to-amber-400"
            suffix="일"
            loading={loading}
          />
          <StatCard
            title="총 학습 시간"
            value={Math.round((stats?.totalStudyTime || 0) / 60)}
            icon={Clock}
            gradient="from-violet-500 to-purple-400"
            suffix="분"
            loading={loading}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Link href="/review" className="group">
            <Card className="h-full border-0 shadow-lg shadow-blue-500/5 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">카드 복습하기</h3>
                  <p className="text-sm text-slate-500 mb-3">간격 반복으로 효율적인 암기</p>
                  {dueCards?.dueCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                      <Zap className="w-3.5 h-3.5" />
                      {dueCards.dueCount}개 대기 중
                    </span>
                  )}
                </div>
                <ArrowRight className="absolute right-6 bottom-6 w-5 h-5 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/curriculums" className="group">
            <Card className="h-full border-0 shadow-lg shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-300 overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/30 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">커리큘럼 만들기</h3>
                  <p className="text-sm text-slate-500 mb-3">AI가 맞춤 학습 계획을 생성</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    <Sparkles className="w-3.5 h-3.5" />
                    AI 추천
                  </span>
                </div>
                <ArrowRight className="absolute right-6 bottom-6 w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>

          <Link href="/mindmap" className="group">
            <Card className="h-full border-0 shadow-lg shadow-violet-500/5 hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 overflow-hidden">
              <CardContent className="p-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                    <Brain className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-1">마인드맵 작성</h3>
                  <p className="text-sm text-slate-500 mb-3">개념을 시각적으로 연결</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">
                    <TrendingUp className="w-3.5 h-3.5" />
                    이해력 향상
                  </span>
                </div>
                <ArrowRight className="absolute right-6 bottom-6 w-5 h-5 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Tips */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              오늘의 학습 팁
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                '매일 규칙적으로 복습하면 기억 유지율이 크게 향상됩니다',
                '어려운 카드는 여러 번 반복해서 학습하세요',
                '마인드맵으로 개념 간 연결을 시각화하면 이해가 쉬워집니다',
                '기억의 궁전 기법으로 공간 기억력을 활용해보세요',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <p className="text-sm text-slate-700">{tip}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  suffix = '',
  loading,
}: {
  title: string;
  value: number;
  icon: any;
  gradient: string;
  suffix?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-800">
              {loading ? (
                <span className="inline-block w-16 h-8 bg-slate-100 rounded animate-pulse" />
              ) : (
                <>{value}<span className="text-lg font-medium text-slate-400 ml-1">{suffix}</span></>
              )}
            </p>
          </div>
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
