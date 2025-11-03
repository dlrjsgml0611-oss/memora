'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { api } from '@/lib/api/client';

export default function DashboardPage() {
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

      if (userResponse.success) {
        setStats(userResponse.data.stats);
      }

      if (dueCardsResponse.success) {
        setDueCards(dueCardsResponse.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">대시보드</h1>
          <p className="text-gray-600 mt-2">학습 현황을 한눈에 확인하세요</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="복습 대기"
            value={dueCards?.dueCount || 0}
            icon="📝"
            color="blue"
            loading={loading}
          />
          <StatCard
            title="학습한 카드"
            value={stats?.cardsReviewed || 0}
            icon="✅"
            color="green"
            loading={loading}
          />
          <StatCard
            title="현재 스트릭"
            value={stats?.currentStreak || 0}
            icon="🔥"
            color="orange"
            suffix="일"
            loading={loading}
          />
          <StatCard
            title="총 학습 시간"
            value={Math.round((stats?.totalStudyTime || 0) / 60)}
            icon="⏱️"
            color="purple"
            suffix="분"
            loading={loading}
          />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 시작</CardTitle>
            <CardDescription>오늘 무엇을 학습하시겠어요?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/review">
              <Button className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <span className="text-3xl">📝</span>
                <span>카드 복습하기</span>
                {dueCards && dueCards.dueCount > 0 && (
                  <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded">
                    {dueCards.dueCount}개 대기 중
                  </span>
                )}
              </Button>
            </Link>

            <Link href="/curriculums">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <span className="text-3xl">📚</span>
                <span>커리큘럼 만들기</span>
              </Button>
            </Link>

            <Link href="/mindmap">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center space-y-2">
                <span className="text-3xl">🧠</span>
                <span>마인드맵 작성</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>최근 학습 기록을 확인하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              최근 활동이 없습니다. 지금 바로 학습을 시작하세요!
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>💡</span>
              <span>학습 팁</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-gray-700">
              <li>• 매일 규칙적으로 복습하면 기억 유지율이 크게 향상됩니다</li>
              <li>• 어려운 카드는 여러 번 반복해서 학습하세요</li>
              <li>• 마인드맵으로 개념 간 연결을 시각화하면 이해가 쉬워집니다</li>
              <li>• 기억의 궁전 기법으로 공간 기억력을 활용해보세요</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  suffix = '',
  loading,
}: {
  title: string;
  value: number;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
  suffix?: string;
  loading?: boolean;
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">
              {loading ? '...' : `${value}${suffix}`}
            </p>
          </div>
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-2xl`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
