'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import { useAuthStore } from '@/store/authStore';
import { User, Settings2, BarChart3, AlertTriangle, Loader2, Save, Calendar, Clock, Layers, Flame, Trophy } from 'lucide-react';

export default function SettingsPage() {
  const { updateUser } = useAuthStore();
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
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className="text-slate-500">설정을 불러오는 중...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">설정</h1>
          <p className="text-slate-500 mt-1">계정 및 학습 설정을 관리하세요</p>
        </div>

        {/* Profile */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-500" />
              프로필
            </CardTitle>
            <CardDescription>기본 정보를 관리하세요</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>이메일</Label>
              <Input value={userData?.email || ''} disabled className="bg-slate-50 rounded-xl" />
              <p className="text-xs text-slate-400">이메일은 변경할 수 없습니다</p>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">사용자 이름</Label>
                <Input id="username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required className="rounded-xl" />
              </div>
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />저장 중...</> : <><Save className="w-4 h-4 mr-2" />프로필 저장</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Learning Preferences */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-violet-500" />
              학습 설정
            </CardTitle>
            <CardDescription>학습 환경을 설정하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="dailyReviewTarget">일일 복습 목표 (카드 수)</Label>
                <Input id="dailyReviewTarget" type="number" min="1" max="500" value={formData.dailyReviewTarget} onChange={(e) => setFormData({ ...formData, dailyReviewTarget: parseInt(e.target.value) })} required className="rounded-xl" />
                <p className="text-xs text-slate-400">하루에 복습할 카드 개수를 설정하세요</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredAI">선호하는 AI 모델</Label>
                <select id="preferredAI" className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={formData.preferredAI} onChange={(e) => setFormData({ ...formData, preferredAI: e.target.value as any })}>
                  <option value="openai">OpenAI GPT-4</option>
                  <option value="claude">Anthropic Claude 3.5</option>
                  <option value="gemini">Google Gemini Pro</option>
                </select>
                <p className="text-xs text-slate-400">커리큘럼 및 콘텐츠 생성에 사용할 기본 AI 모델</p>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50">
                <input type="checkbox" id="notifications" checked={formData.notificationsEnabled} onChange={(e) => setFormData({ ...formData, notificationsEnabled: e.target.checked })} className="w-5 h-5 text-blue-600 rounded-lg" />
                <Label htmlFor="notifications" className="cursor-pointer flex-1">
                  <span className="font-medium">알림 활성화</span>
                  <p className="text-xs text-slate-400 mt-0.5">복습 알림을 받습니다</p>
                </Label>
              </div>
              <Button type="submit" disabled={saving} className="rounded-xl">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />저장 중...</> : <><Save className="w-4 h-4 mr-2" />설정 저장</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Stats */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              계정 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: Calendar, label: '가입일', value: new Date(userData?.createdAt).toLocaleDateString('ko-KR'), color: 'blue' },
                { icon: Clock, label: '총 학습 시간', value: `${Math.round((userData?.stats?.totalStudyTime || 0) / 60)}분`, color: 'violet' },
                { icon: Layers, label: '복습한 카드', value: `${userData?.stats?.cardsReviewed || 0}개`, color: 'emerald' },
                { icon: Flame, label: '현재 스트릭', value: `${userData?.stats?.currentStreak || 0}일`, color: 'orange' },
                { icon: Trophy, label: '최장 스트릭', value: `${userData?.stats?.longestStreak || 0}일`, color: 'amber' },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50">
                  <stat.icon className={`w-5 h-5 text-${stat.color}-500 mb-2`} />
                  <p className="text-xs text-slate-400 mb-0.5">{stat.label}</p>
                  <p className="text-lg font-semibold text-slate-700">{stat.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-0 shadow-lg border-l-4 border-l-red-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              위험 구역
            </CardTitle>
            <CardDescription>주의가 필요한 작업입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" disabled className="rounded-xl">계정 삭제</Button>
            <p className="text-xs text-slate-400 mt-2">계정 삭제 기능은 현재 비활성화되어 있습니다</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
