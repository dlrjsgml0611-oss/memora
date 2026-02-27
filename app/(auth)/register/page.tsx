'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Sparkles, CalendarCheck, BrainCircuit, Shield } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const onboardingPerks = [
  {
    title: 'AI 온보딩 세션',
    description: '학습 목적과 현재 수준을 파악해 맞춤 커리큘럼을 자동 생성합니다.',
    icon: Sparkles,
  },
  {
    title: '7일 집중 플랜',
    description: '첫 일주일은 데일리 리마인더와 플래시카드로 기초를 다집니다.',
    icon: CalendarCheck,
  },
  {
    title: '개념 멘탈 모델',
    description: '마인드맵과 기억의 궁전으로 어려운 개념을 시각적으로 연결합니다.',
    icon: BrainCircuit,
  },
  {
    title: '데이터 보안',
    description: '학습 기록과 업로드 자료는 모두 암호화되어 안전하게 보관됩니다.',
    icon: Shield,
  },
]

export default function RegisterPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다')
      return
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다')
      return
    }

    setLoading(true)

    try {
      const response: any = await api.register(email, password, username)

      if (response.success) {
        login(response.data.user)
        router.push('/dashboard')
      } else {
        setError(response.error || '회원가입에 실패했습니다')
      }
    } catch (err: any) {
      setError(err.message || '회원가입 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(125,211,252,0.12),_rgba(15,23,42,1))]" />
      <div className="absolute left-1/4 top-0 -z-10 h-[360px] w-[360px] rounded-full bg-blue-500/20 blur-[160px]" />
      <div className="absolute right-0 bottom-10 -z-10 h-[420px] w-[420px] translate-x-1/4 rounded-full bg-purple-500/20 blur-[160px]" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:gap-20">
        <Card className="order-last w-full max-w-md border-white/10 bg-white/10 backdrop-blur lg:order-first">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-bold text-white">회원가입</CardTitle>
            <CardDescription className="text-slate-200/70">
              몇 가지 정보만 입력하면, 당신만을 위한 학습 로드맵과 AI 도구가 즉시 준비됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-100">
                  사용자 이름
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="홍길동"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading}
                  className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-100">
                  이메일
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-100">
                  비밀번호
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-100">
                  비밀번호 확인
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="border-white/10 bg-white/10 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400"
                />
              </div>

              <Button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400"
                disabled={loading}
              >
                {loading ? '가입 중...' : 'Memora 시작하기'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <div className="text-sm text-slate-200/70">
              이미 계정이 있으신가요?{' '}
              <Link href="/login" className="font-semibold text-blue-200 transition hover:text-white">
                로그인하기
              </Link>
            </div>
            <div className="text-sm">
              <Link href="/" className="inline-flex items-center gap-2 text-slate-300/80 transition hover:text-white">
                메인 페이지로 이동
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </CardFooter>
        </Card>

        <div className="flex-1 space-y-10">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white/80 transition hover:text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-base font-bold uppercase tracking-[0.3em]">
              M
            </span>
            Memora
          </Link>

          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              Start your journey
            </div>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              나만의 AI 학습 코치와
              <br />
              깊이 있는 지식 루틴을 만들어보세요
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-200/80">
              Memora는 학습자의 페이스와 목표에 맞춰 지식 탐색, 기억 강화, 실전 적용까지 진짜 성장을 돕는 학습
              파트너입니다. 가입 즉시 AI 온보딩 세션이 시작돼요.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {onboardingPerks.map((perk) => (
              <div key={perk.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/10">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
                  <perk.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-white">{perk.title}</p>
                <p className="mt-2 text-xs text-slate-300/80">{perk.description}</p>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold text-white/80">
            <Sparkles className="h-4 w-4 text-blue-200" />
            지금 가입하면 프리미엄 기능 7일 무료 체험이 제공됩니다.
          </div>
        </div>
      </div>
    </div>
  )
}
