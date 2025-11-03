'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [formData, setFormData] = useState({
    username: '',
    dailyReviewTarget: 20,
    preferredAI: 'openai' as 'openai' | 'claude' | 'gemini',
    notificationsEnabled: true,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response: any = await api.getMe();
      if (response.success) {
        setUserData(response.data);
        setFormData({
          username: response.data.username,
          dailyReviewTarget: response.data.preferences?.dailyReviewTarget || 20,
          preferredAI: response.data.preferences?.preferredAI || 'openai',
          notificationsEnabled: response.data.preferences?.notificationsEnabled ?? true,
        });
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response: any = await api.updateProfile({
        username: formData.username,
        preferences: {
          dailyReviewTarget: formData.dailyReviewTarget,
          preferredAI: formData.preferredAI,
          notificationsEnabled: formData.notificationsEnabled,
        },
      });

      if (response.success) {
        updateUser({ username: formData.username });
        alert('설정이 저장되었습니다');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('설정 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <div className="text-gray-500">설정을 불러오는 중...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">설정</h1>
          <p className="text-gray-600 mt-2">계정 및 학습 설정을 관리하세요</p>
        </div>

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>프로필</CardTitle>
            <CardDescription>기본 정보를 관리하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input value={userData?.email || ''} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500">이메일은 변경할 수 없습니다</p>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">사용자 이름</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? '저장 중...' : '프로필 저장'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Learning Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>학습 설정</CardTitle>
            <CardDescription>학습 환경을 설정하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dailyReviewTarget">일일 복습 목표 (카드 수)</Label>
                <Input
                  id="dailyReviewTarget"
                  type="number"
                  min="1"
                  max="500"
                  value={formData.dailyReviewTarget}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyReviewTarget: parseInt(e.target.value) })
                  }
                  required
                />
                <p className="text-xs text-gray-500">하루에 복습할 카드 개수를 설정하세요</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredAI">선호하는 AI 모델</Label>
                <select
                  id="preferredAI"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.preferredAI}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredAI: e.target.value as any })
                  }
                >
                  <option value="openai">OpenAI GPT-4</option>
                  <option value="claude">Claude 3.5 Sonnet</option>
                  <option value="gemini">Google Gemini Pro</option>
                </select>
                <p className="text-xs text-gray-500">
                  커리큘럼 및 콘텐츠 생성에 사용할 기본 AI 모델
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={formData.notificationsEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, notificationsEnabled: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <Label htmlFor="notifications" className="cursor-pointer">
                  알림 활성화
                </Label>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? '저장 중...' : '설정 저장'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card>
          <CardHeader>
            <CardTitle>계정 통계</CardTitle>
            <CardDescription>학습 기록</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">가입일</div>
                <div className="text-lg font-semibold">
                  {new Date(userData?.createdAt).toLocaleDateString('ko-KR')}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">총 학습 시간</div>
                <div className="text-lg font-semibold">
                  {Math.round((userData?.stats?.totalStudyTime || 0) / 60)}분
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">복습한 카드</div>
                <div className="text-lg font-semibold">
                  {userData?.stats?.cardsReviewed || 0}개
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">현재 스트릭</div>
                <div className="text-lg font-semibold text-orange-600">
                  {userData?.stats?.currentStreak || 0}일
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">최장 스트릭</div>
                <div className="text-lg font-semibold text-purple-600">
                  {userData?.stats?.longestStreak || 0}일
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">위험 구역</CardTitle>
            <CardDescription>주의가 필요한 작업입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled>
              계정 삭제
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              계정 삭제 기능은 현재 비활성화되어 있습니다
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
