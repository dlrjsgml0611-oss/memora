'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'
import { LogIn, Sparkles, ShieldCheck, ArrowRight, LineChart } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { api } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const highlights = [
  {
    title: '간편한 AI 튜터 호출',
    description: '한 번의 클릭으로 학습 중 막힌 부분을 AI가 실시간으로 해설합니다.',
    icon: Sparkles,
  },
  {
    title: '보안이 보장된 데이터',
    description: '학습 활동과 노트는 모두 암호화되어 안전하게 보관됩니다.',
    icon: ShieldCheck,
  },
  {
    title: '성장 흐름 가시화',
    description: '진도, 정답률, 집중도를 분석한 시각 리포트를 제공합니다.',
    icon: LineChart,
  },
]

export default function LoginPage() {
  const router = useRouter()
  const login = useAuthStore((state) => state.login)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response: any = await api.login(email, password)

      if (response.success) {
        login(response.data.user)
        router.push('/dashboard')
      } else {
        setError(response.error || '로그인에 실패했습니다')
      }
    } catch (err: any) {
      setError(err.message || '로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_rgba(15,23,42,0.9))]" />
      <div className="absolute left-1/2 top-0 -z-10 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[160px]" />
      <div className="absolute bottom-0 right-0 -z-10 h-[360px] w-[360px] translate-x-1/3 translate-y-1/3 rounded-full bg-purple-500/20 blur-[160px]" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16 lg:flex-row lg:items-center lg:gap-20">
        <div className="flex-1 space-y-8">
          <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold text-white/80 transition hover:text-white">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-base font-bold uppercase tracking-[0.3em]">
              M
            </span>
            Memora
          </Link>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
              <LogIn className="h-3.5 w-3.5" />
              Welcome back
            </div>
            <h1 className="text-4xl font-bold text-white sm:text-5xl">
              다시 돌아오셨네요!
              <br />
              오늘도 학습 여정을 이어가볼까요?
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-200/80">
              어제까지의 학습 맥락과 AI 추천이 그대로 이어집니다. 오늘은 어떤 성장 그래프를 그려볼까요?
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur transition hover:border-white/20 hover:bg-white/10">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-blue-200">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="mt-2 text-xs text-slate-300/80">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="w-full max-w-md border-white/10 bg-white/10 backdrop-blur">
          <CardHeader className="space-y-3">
            <CardTitle className="text-3xl font-bold text-white">로그인</CardTitle>
            <CardDescription className="text-slate-200/70">
              Memora 계정으로 로그인하고 AI 학습 보조와 대시보드를 이어서 사용하세요.
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

              <Button
                type="submit"
                className="w-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400"
                disabled={loading}
              >
                {loading ? '로그인 중...' : '학습 시작하기'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <div className="text-sm text-slate-200/70">
              계정이 없으신가요?{' '}
              <Link href="/register" className="font-semibold text-blue-200 transition hover:text-white">
                무료로 가입하기
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
      </div>
    </div>
  )
}
