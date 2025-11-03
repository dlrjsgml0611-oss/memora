'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api/client';

export default function StatsPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response: any = await api.getMe();
      if (response.success) {
        setUserData(response.data);
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
        <div className="text-center py-12">
          <div className="text-gray-500">통계를 불러오는 중...</div>
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
          <h1 className="text-4xl font-bold text-gray-900">학습 통계</h1>
          <p className="text-gray-600 mt-2">당신의 학습 여정을 확인하세요</p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="총 학습 시간"
            value={`${totalHours}시간 ${totalMinutes}분`}
            icon="⏱️"
            color="blue"
          />
          <StatCard
            title="복습한 카드"
            value={stats.cardsReviewed || 0}
            icon="📝"
            color="green"
          />
          <StatCard
            title="현재 스트릭"
            value={`${stats.currentStreak || 0}일`}
            icon="🔥"
            color="orange"
          />
          <StatCard
            title="최장 스트릭"
            value={`${stats.longestStreak || 0}일`}
            icon="🏆"
            color="purple"
          />
        </div>

        {/* Learning Streak */}
        <Card>
          <CardHeader>
            <CardTitle>학습 스트릭</CardTitle>
            <CardDescription>연속 학습 기록을 유지하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🔥</div>
              <div className="text-4xl font-bold text-orange-600 mb-2">
                {stats.currentStreak || 0}일
              </div>
              <div className="text-gray-600">현재 연속 학습 기록</div>
              {stats.currentStreak > 0 && (
                <div className="mt-4 text-sm text-gray-500">
                  계속 학습하면 기록이 이어집니다!
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress Overview */}
        <Card>
          <CardHeader>
            <CardTitle>학습 진행 상황</CardTitle>
            <CardDescription>전체적인 학습 현황</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">총 복습한 카드</span>
                <span className="font-semibold">{stats.cardsReviewed || 0}개</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${Math.min((stats.cardsReviewed || 0) / 100 * 100, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {Math.round((stats.totalStudyTime || 0) / 60)}
                </div>
                <div className="text-sm text-gray-600 mt-1">총 학습 시간 (분)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {stats.cardsReviewed || 0}
                </div>
                <div className="text-sm text-gray-600 mt-1">복습한 카드</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>달성 과제</CardTitle>
            <CardDescription>학습 목표를 달성하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Achievement
                title="첫 복습"
                description="첫 번째 카드 복습 완료"
                achieved={stats.cardsReviewed >= 1}
                icon="🎯"
              />
              <Achievement
                title="꾸준한 학습자"
                description="7일 연속 학습"
                achieved={stats.longestStreak >= 7}
                icon="📚"
              />
              <Achievement
                title="학습 마스터"
                description="100개 카드 복습"
                achieved={stats.cardsReviewed >= 100}
                icon="🏆"
              />
              <Achievement
                title="시간 투자자"
                description="10시간 학습 달성"
                achieved={totalHours >= 10}
                icon="⏰"
              />
              <Achievement
                title="열정적인 학습자"
                description="30일 연속 학습"
                achieved={stats.longestStreak >= 30}
                icon="🔥"
              />
              <Achievement
                title="학습 챔피언"
                description="500개 카드 복습"
                achieved={stats.cardsReviewed >= 500}
                icon="👑"
              />
            </div>
          </CardContent>
        </Card>

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>프로필 정보</CardTitle>
            <CardDescription>계정 정보</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">이름</span>
                <span className="font-semibold">{userData?.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">이메일</span>
                <span className="font-semibold">{userData?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">가입일</span>
                <span className="font-semibold">
                  {new Date(userData?.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">일일 복습 목표</span>
                <span className="font-semibold">
                  {userData?.preferences?.dailyReviewTarget || 20}개
                </span>
              </div>
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
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
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
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-2xl`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Achievement({
  title,
  description,
  achieved,
  icon,
}: {
  title: string;
  description: string;
  achieved: boolean;
  icon: string;
}) {
  return (
    <div
      className={`p-4 rounded-lg border-2 transition ${
        achieved
          ? 'border-yellow-400 bg-yellow-50'
          : 'border-gray-200 bg-gray-50 opacity-50'
      }`}
    >
      <div className="text-center">
        <div className="text-4xl mb-2">{icon}</div>
        <div className="font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-600 mt-1">{description}</div>
        {achieved && (
          <div className="mt-2 text-xs font-semibold text-yellow-600">달성!</div>
        )}
      </div>
    </div>
  );
}
