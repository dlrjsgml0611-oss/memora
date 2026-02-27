'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';
import { Clock, Layers, Flame, Trophy, Target, BookOpen, Timer, Crown, Loader2, User, Mail, Calendar, CheckCircle2, Brain, BarChart3 } from 'lucide-react';

interface MemoryPalaceSummary {
  sessions: number;
  totalItems: number;
  correctItems: number;
  accuracy: number;
  totalDurationSec: number;
}

interface MemoryPalaceReviewRecord {
  finishedAt: string;
  totalItems: number;
  correctItems: number;
}

interface MemoryPalaceWeeklyTrend {
  weekKey: string;
  weekLabel: string;
  sessions: number;
  totalItems: number;
  accuracy: number;
}

function getWeekStart(dateInput: Date) {
  const date = new Date(dateInput);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + diff);
  return date;
}

function formatWeekLabel(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  return `${weekStart.getMonth() + 1}/${weekStart.getDate()}-${end.getMonth() + 1}/${end.getDate()}`;
}

function buildMemoryPalaceWeeklyTrend(
  items: MemoryPalaceReviewRecord[],
  weeks = 8
): MemoryPalaceWeeklyTrend[] {
  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const buckets = new Map<string, { weekStart: Date; sessions: number; totalItems: number; correctItems: number }>();

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(thisWeekStart);
    weekStart.setDate(thisWeekStart.getDate() - i * 7);
    const key = weekStart.toISOString().split('T')[0];
    buckets.set(key, {
      weekStart,
      sessions: 0,
      totalItems: 0,
      correctItems: 0,
    });
  }

  items.forEach((item) => {
    const finishedAt = new Date(item.finishedAt);
    if (Number.isNaN(finishedAt.getTime())) return;

    const weekStart = getWeekStart(finishedAt);
    const key = weekStart.toISOString().split('T')[0];
    const bucket = buckets.get(key);
    if (!bucket) return;

    bucket.sessions += 1;
    bucket.totalItems += item.totalItems || 0;
    bucket.correctItems += item.correctItems || 0;
  });

  return Array.from(buckets.entries()).map(([weekKey, value]) => ({
    weekKey,
    weekLabel: formatWeekLabel(value.weekStart),
    sessions: value.sessions,
    totalItems: value.totalItems,
    accuracy: value.totalItems > 0
      ? Math.round((value.correctItems / value.totalItems) * 1000) / 10
      : 0,
  }));
}

export default function StatsPage() {
  const [userData, setUserData] = useState<any>(null);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [memoryPalace, setMemoryPalace] = useState<MemoryPalaceSummary>({
    sessions: 0,
    totalItems: 0,
    correctItems: 0,
    accuracy: 0,
    totalDurationSec: 0,
  });
  const [memoryPalaceTrend, setMemoryPalaceTrend] = useState<MemoryPalaceWeeklyTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [userRes, activityRes, memoryReviewRes] = await Promise.all([
        api.getMe(),
        api.getActivityStats(),
        api.getMemoryPalaceReviews(120),
      ]);
      if (userRes.success) setUserData(userRes.data);
      if (activityRes.success) {
        setActivity(activityRes.data.activity || {});
        setMemoryPalace(activityRes.data.memoryPalace || {
          sessions: 0,
          totalItems: 0,
          correctItems: 0,
          accuracy: 0,
          totalDurationSec: 0,
        });
      }
      if (memoryReviewRes.success) {
        setMemoryPalaceTrend(buildMemoryPalaceWeeklyTrend(memoryReviewRes.data?.items || []));
      }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-5">
          <StatCard title="총 학습 시간" value={`${totalHours}시간 ${totalMinutes}분`} icon={Clock} gradient="from-blue-500 to-cyan-400" />
          <StatCard title="복습한 카드" value={stats.cardsReviewed || 0} icon={Layers} gradient="from-emerald-500 to-teal-400" />
          <StatCard title="현재 스트릭" value={`${stats.currentStreak || 0}일`} icon={Flame} gradient="from-orange-500 to-amber-400" />
          <StatCard title="최장 스트릭" value={`${stats.longestStreak || 0}일`} icon={Trophy} gradient="from-violet-500 to-purple-400" />
          <StatCard title="7일 유지율" value={`${stats.sevenDayRetention || 0}%`} icon={Target} gradient="from-indigo-500 to-blue-400" />
          <StatCard title="주간 활동일" value={`${stats.weeklyActiveDays || 0}일`} icon={Calendar} gradient="from-cyan-500 to-sky-400" />
          <StatCard title="궁전 회상 세션" value={memoryPalace.sessions || 0} icon={Brain} gradient="from-amber-500 to-orange-400" />
        </div>

        {/* Activity Heatmap */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              학습 활동
            </CardTitle>
            <CardDescription>지난 1년간의 학습 기록</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityHeatmap activity={activity} memoryPalace={memoryPalace} />
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              기억의 궁전 주간 추세
            </CardTitle>
            <CardDescription>최근 8주 세션 수와 정답률 흐름</CardDescription>
          </CardHeader>
          <CardContent>
            <WeeklyMemoryPalaceTrend trend={memoryPalaceTrend} />
          </CardContent>
        </Card>

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

function ActivityHeatmap({
  activity,
  memoryPalace,
}: {
  activity: Record<string, number>;
  memoryPalace: {
    sessions: number;
    totalItems: number;
    correctItems: number;
    accuracy: number;
    totalDurationSec: number;
  };
}) {
  const weeks = 53;
  const days = ['일', '월', '화', '수', '목', '금', '토'];

  const getColor = (count: number) => {
    if (count === 0) return 'bg-slate-100';
    if (count <= 2) return 'bg-emerald-200';
    if (count <= 5) return 'bg-emerald-300';
    if (count <= 10) return 'bg-emerald-400';
    return 'bg-emerald-500';
  };

  const generateDates = () => {
    const result: { date: string; count: number; dayOfWeek: number }[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (weeks * 7) + (6 - today.getDay()));

    for (let w = 0; w < weeks; w++) {
      const week: { date: string; count: number; dayOfWeek: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + w * 7 + d);
        const dateStr = date.toISOString().split('T')[0];
        week.push({
          date: dateStr,
          count: activity[dateStr] || 0,
          dayOfWeek: d,
        });
      }
      result.push(week);
    }
    return result;
  };

  const data = generateDates();
  const totalReviews = Object.values(activity).reduce((a, b) => a + b, 0);
  const activeDays = Object.keys(activity).length;
  const palaceMinutes = Math.round((memoryPalace.totalDurationSec || 0) / 60);

  return (
    <div className="space-y-4">
      <div className="flex gap-6 text-sm">
        <div><span className="text-slate-500">총 활동:</span> <span className="font-semibold">{totalReviews}회</span></div>
        <div><span className="text-slate-500">활동일:</span> <span className="font-semibold">{activeDays}일</span></div>
        <div><span className="text-slate-500">궁전 회상:</span> <span className="font-semibold">{memoryPalace.sessions}세션</span></div>
        <div><span className="text-slate-500">궁전 정답률:</span> <span className="font-semibold">{memoryPalace.accuracy || 0}%</span></div>
        <div><span className="text-slate-500">궁전 학습시간:</span> <span className="font-semibold">{palaceMinutes}분</span></div>
      </div>
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-max">
          <div className="flex flex-col gap-1 mr-2 text-xs text-slate-400">
            {days.map((d, i) => (
              <div key={i} className="h-3 flex items-center">{i % 2 === 1 ? d : ''}</div>
            ))}
          </div>
          {data.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <div
                  key={di}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)} cursor-pointer transition-transform hover:scale-125`}
                  title={`${day.date}: ${day.count}회 복습`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span>적음</span>
        {['bg-slate-100', 'bg-emerald-200', 'bg-emerald-300', 'bg-emerald-400', 'bg-emerald-500'].map((c, i) => (
          <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>많음</span>
      </div>
    </div>
  );
}

function WeeklyMemoryPalaceTrend({ trend }: { trend: MemoryPalaceWeeklyTrend[] }) {
  const maxSessions = Math.max(...trend.map((item) => item.sessions), 1);
  const latest = trend[trend.length - 1];
  const previous = trend[trend.length - 2];
  const weekDelta = latest && previous ? latest.sessions - previous.sessions : 0;

  if (trend.length === 0 || trend.every((item) => item.sessions === 0)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        아직 주간 회상 데이터가 충분하지 않습니다. 기억의 궁전에서 회상 훈련을 시작해 보세요.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-xs text-slate-500">이번 주 세션</p>
          <p className="text-xl font-bold text-slate-900">{latest?.sessions || 0}회</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-xs text-slate-500">이번 주 정답률</p>
          <p className="text-xl font-bold text-slate-900">{latest?.accuracy || 0}%</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-3">
          <p className="text-xs text-slate-500">전주 대비 세션</p>
          <p className={`text-xl font-bold ${weekDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {weekDelta >= 0 ? `+${weekDelta}` : weekDelta}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-[620px] items-end gap-3">
          {trend.map((item) => (
            <div key={item.weekKey} className="flex-1">
              <div className="mb-2 h-28 rounded-lg bg-slate-100 p-1">
                <div
                  className="flex w-full items-start justify-center rounded-md bg-gradient-to-t from-amber-500 to-orange-400 pt-1 text-[10px] font-semibold text-white transition-all"
                  style={{
                    height: `${Math.max((item.sessions / maxSessions) * 100, item.sessions > 0 ? 12 : 0)}%`,
                  }}
                  title={`${item.weekLabel}: ${item.sessions}회, 정답률 ${item.accuracy}%`}
                >
                  {item.sessions > 0 ? item.sessions : ''}
                </div>
              </div>
              <p className="text-center text-[11px] text-slate-500">{item.weekLabel}</p>
              <p className="text-center text-xs font-medium text-slate-700">{item.accuracy}%</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
