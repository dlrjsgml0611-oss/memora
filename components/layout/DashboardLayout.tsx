'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard, BookOpen, Layers, GraduationCap, Lightbulb,
  Brain, Castle, Sparkles, BarChart3, Settings, LogOut, Loader2,
  PanelLeftClose, PanelLeft
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user, logout, _hasHydrated } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const navItems = [
    { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
    { href: '/review', label: '복습하기', icon: BookOpen },
    { href: '/flashcards', label: '플래시카드', icon: Layers },
    { href: '/curriculums', label: '커리큘럼', icon: GraduationCap },
    { href: '/concepts', label: '개념 라이브러리', icon: Lightbulb },
    { href: '/mindmap', label: '마인드맵', icon: Brain },
    { href: '/memory-palace', label: '기억의 궁전', icon: Castle },
    { href: '/ai-mnemonics', label: 'AI 기억술', icon: Sparkles },
    { href: '/stats', label: '통계', icon: BarChart3 },
    { href: '/settings', label: '설정', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-white/80 backdrop-blur-xl border-r border-slate-200/60 overflow-y-auto z-50 transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}>
        <div className={`p-4 ${collapsed ? 'px-3' : 'p-6 pb-4'}`}>
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:shadow-blue-500/40 transition-shadow flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Memora
              </span>
            )}
          </Link>
        </div>

        {/* User Info */}
        {!collapsed && (
          <div className="mx-4 mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
                {user?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{user?.username}</p>
                <p className="text-xs text-slate-500">학습자</p>
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="flex justify-center mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        <nav className={`space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-xl transition-all duration-200 group ${collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3'} ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
                {!collapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent pt-8 space-y-2 ${collapsed ? 'px-2' : ''}`}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          >
            {collapsed ? <PanelLeft className="w-5 h-5" /> : <><PanelLeftClose className="w-5 h-5" /><span className="text-sm">접기</span></>}
          </button>
          <Button
            onClick={handleLogout}
            variant="outline"
            className={`w-full rounded-xl border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all ${collapsed ? 'px-2' : ''}`}
            title={collapsed ? '로그아웃' : undefined}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="ml-2">로그아웃</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-300 ${collapsed ? 'pl-20' : 'pl-72'}`}>
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
