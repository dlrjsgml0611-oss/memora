'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { Clock, Layers, Flame, Trophy, Target, BookOpen, Timer, Crown, Loader2, User, Mail, Calendar, CheckCircle2 } from 'lucide-react';

export default function StatsPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response: any = await api.getMe();
      if (response.success) setUserData(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className="text-slate-500">통계를 불러오는 중...</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = userData?.stats || {};
  const totalHours = Math.floor((stats.totalStudyTime || 0) / 3600);
  const totalMinutes = Math.floor(((stats.totalStudyTime || 0) % 3600) / 60);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">학습 통계</h1>
          <p className="text-slate-500 mt-1">당신의 학습 여정을 확인하세요</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard title="총 학습 시간" value={`${totalHours}시간 ${totalMinutes}분`} icon={Clock} gradient="from-blue-500 to-cyan-400" />
          <StatCard title="복습한 카드" value={stats.cardsReviewed || 0} icon={Layers} gradient="from-emerald-500 to-teal-400" />
          <StatCard title="현재 스트릭" value={`${stats.currentStreak || 0}일`} icon={Flame} gradient="from-orange-500 to-amber-400" />
          <StatCard title="최장 스트릭" value={`${stats.longestStreak || 0}일`} icon={Trophy} gradient="from-violet-500 to-purple-400" />
        </div>

        {/* Streak Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 p-8 text-white text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-white/20 backdrop-blur flex items-center justify-center mb-4">
              <Flame className="w-10 h-10" />
            </div>
            <div className="text-5xl font-bold mb-2">{stats.currentStreak || 0}일</div>
            <p className="text-orange-100">현재 연속 학습 기록</p>
            {stats.currentStreak > 0 && (
              <p className="mt-3 text-sm text-orange-100/80">계속 학습하면 기록이 이어집니다!</p>
            )}
          </div>
        </Card>

        {/* Progress */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              학습 진행 상황
            </CardTitle>
            <CardDescription>전체적인 학습 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500">총 복습한 카드</span>
                <span className="font-semibold text-slate-700">{stats.cardsReviewed || 0}개 / 목표 1000개</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(((stats.cardsReviewed || 0) / 1000) * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
                <Timer className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-800">{Math.round((stats.totalStudyTime || 0) / 60)}</div>
                <p className="text-sm text-slate-500 mt-1">총 학습 시간 (분)</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50">
                <BookOpen className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <div className="text-3xl font-bold text-slate-800">{stats.cardsReviewed || 0}</div>
                <p className="text-sm text-slate-500 mt-1">복습한 카드</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              달성 과제
            </CardTitle>
            <CardDescription>학습 목표를 달성하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Achievement title="첫 복습" description="첫 번째 카드 복습 완료" achieved={stats.cardsReviewed >= 1} icon={Target} />
              <Achievement title="꾸준한 학습자" description="7일 연속 학습" achieved={stats.longestStreak >= 7} icon={BookOpen} />
              <Achievement title="학습 마스터" description="100개 카드 복습" achieved={stats.cardsReviewed >= 100} icon={Trophy} />
              <Achievement title="시간 투자자" description="10시간 학습 달성" achieved={totalHours >= 10} icon={Timer} />
              <Achievement title="열정적인 학습자" description="30일 연속 학습" achieved={stats.longestStreak >= 30} icon={Flame} />
              <Achievement title="학습 챔피언" description="500개 카드 복습" achieved={stats.cardsReviewed >= 500} icon={Crown} />
            </div>
          </CardContent>
        </Card>

        {/* Profile */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-slate-500" />
              프로필 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: User, label: '이름', value: userData?.username },
                { icon: Mail, label: '이메일', value: userData?.email },
                { icon: Calendar, label: '가입일', value: new Date(userData?.createdAt).toLocaleDateString('ko-KR') },
                { icon: Target, label: '일일 복습 목표', value: `${userData?.preferences?.dailyReviewTarget || 20}개` },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500">{item.label}</span>
                  </div>
                  <span className="font-medium text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon: Icon, gradient }: { title: string; value: string | number; icon: any; gradient: string }) {
  return (
    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
            <p className="text-2xl font-bold text-slate-800">{value}</p>
          </div>
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Achievement({ title, description, achieved, icon: Icon }: { title: string; description: string; achieved: boolean; icon: any }) {
  return (
    <div className={`relative p-5 rounded-2xl border-2 transition-all ${achieved ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
      {achieved && <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-amber-500" />}
      <div className={`w-12 h-12 rounded-xl ${achieved ? 'bg-gradient-to-br from-amber-400 to-orange-400' : 'bg-slate-200'} flex items-center justify-center mb-3`}>
        <Icon className={`w-6 h-6 ${achieved ? 'text-white' : 'text-slate-400'}`} />
      </div>
      <h4 className="font-semibold text-slate-800">{title}</h4>
      <p className="text-xs text-slate-500 mt-1">{description}</p>
    </div>
  );
}
