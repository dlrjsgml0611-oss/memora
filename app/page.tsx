import Link from 'next/link'
import {
  ArrowRight,
  Brain,
  CalendarDays,
  CheckCircle2,
  Globe2,
  Layers,
  LineChart,
  Shield,
  Sparkles,
  Users2,
  Wand2,
} from 'lucide-react'

const featureHighlights = [
  {
    title: 'AI 커리큘럼 생성',
    description:
      '학습 목적과 선호도를 입력하면 GPT-4, Claude, Gemini가 협업하여 완성도 높은 스텝별 학습 로드맵을 제안합니다.',
    icon: Sparkles,
    accent: 'from-blue-500/30 to-purple-500/30',
  },
  {
    title: '간격 반복 & 리마인더',
    description:
      'SM-2 알고리즘과 캘린더 연동으로 복습 타이밍을 자동 스케줄링하고, 놓치지 않도록 맞춤 알림을 전송합니다.',
    icon: CalendarDays,
    accent: 'from-cyan-500/30 to-emerald-500/30',
  },
  {
    title: '시각적 학습 인터페이스',
    description:
      '마인드맵, 개념 그래프, 기억의 궁전 UI로 추상적인 지식을 인터랙티브하게 시각화하고 탐색할 수 있습니다.',
    icon: Layers,
    accent: 'from-amber-400/30 to-orange-500/30',
  },
  {
    title: '보안 중심 학습 환경',
    description:
      '엔터프라이즈 급 암호화 및 접근 제어로 팀과 함께 학습해도 안전합니다. 데이터는 모두 지역 규제에 맞춰 보호됩니다.',
    icon: Shield,
    accent: 'from-rose-400/30 to-red-500/30',
  },
]

const learningWorkflows = [
  {
    title: '컨셉 익히기',
    description:
      '핵심 개념을 빠르게 파악할 수 있도록 초반에는 요약 카드와 AI 튜터 질의응답으로 학습을 이끕니다.',
  },
  {
    title: '기억 공고히 하기',
    description:
      '액티브 리콜 퀴즈와 마인드맵을 조합해 기억을 강화하고, 취약한 개념은 자동으로 심화 콘텐츠를 추천합니다.',
  },
  {
    title: '실전 활용',
    description:
      '케이스 스터디, 모의 시험, 프로젝트 챌린지 등 실제 상황에 적용해볼 수 있는 과제를 제공합니다.',
  },
]

const globalStats = [
  { label: '맞춤 커리큘럼', value: '12,800+' },
  { label: '학습 카드', value: '320K+' },
  { label: '장기 기억 유지율', value: '87%' },
  { label: 'AI 세션 만족도', value: '4.9/5' },
]

const collaborativeHighlights = [
  {
    title: '팀 보드 & 실시간 코멘트',
    description: '스터디 팀과 자료를 공유하고, AI 요약본 위에 코멘트를 남겨 지식을 함께 다듬습니다.',
    icon: Users2,
  },
  {
    title: '다국어 학습 엔진',
    description: '스터디 언어에 맞춰 콘텐츠를 번역하고, 음성/텍스트 인터페이스를 자동으로 매칭합니다.',
    icon: Globe2,
  },
  {
    title: '데이터 기반 인사이트',
    description: '학습 패턴과 성과를 대시보드로 시각화하여 무엇을 보완해야 할지 즉시 파악할 수 있습니다.',
    icon: LineChart,
  },
]

const quickstart = [
  '프로필에서 학습 목표와 현재 수준을 입력하세요.',
  'AI가 생성한 로드맵과 리소스를 검토하고 커스터마이징합니다.',
  '리마인더와 복습 세션을 활성화해 학습 리듬을 유지합니다.',
  '팀원과 보드를 공유하거나 강의 초대 링크를 전달하세요.',
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950" style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] translate-x-1/4 translate-y-1/4 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0),_rgba(15,23,42,0.6))]" />
      </div>

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-base font-bold uppercase tracking-[0.3em] text-slate-50">
            M
          </span>
          Memora
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <Link href="#features" className="transition hover:text-white">
            기능
          </Link>
          <Link href="#workflow" className="transition hover:text-white">
            학습 흐름
          </Link>
          <Link href="#team" className="transition hover:text-white">
            팀 협업
          </Link>
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
          >
            로그인
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:to-purple-400"
          >
            무료로 시작하기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10 md:hidden"
        >
          가입하기
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-6 pb-24 pt-6 lg:px-8">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1fr),minmax(0,1.1fr)] lg:items-center lg:gap-16">
          <div className="space-y-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-slate-100">
              <Wand2 className="h-3.5 w-3.5 text-blue-200" />
              AI 학습 큐레이션
            </div>
            <div className="space-y-6">
              <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
                AI 튜터와 함께 만드는
                <br />
                초개인화 학습 플레이북
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-slate-300">
                Memora는 최신 AI 모델과 검증된 기억 전략을 결합해, 개념 이해부터 복습, 실전 적용까지 이어지는 학습
                여정을 설계합니다. 더 적은 시간으로 더 단단한 지식을 쌓아보세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:from-blue-400 hover:via-indigo-400 hover:to-purple-400"
              >
                지금 시작하기
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-base font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
              >
                데모 보기
              </Link>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {globalStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
                  <p className="text-3xl font-bold text-white">{item.value}</p>
                  <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-300/80">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-blue-500/30 via-indigo-500/20 to-purple-500/30 blur-3xl" />
            <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between rounded-2xl bg-slate-950/40 p-4">
                <div>
                  <p className="text-sm text-slate-300/80">이번 주 집중 과목</p>
                  <p className="text-xl font-semibold text-white">Machine Learning Fundamentals</p>
                </div>
                <div className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">+18%</div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">Actively reviewing</span>
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  </div>
                  <p className="mt-4 text-3xl font-semibold text-white">48 cards</p>
                  <p className="mt-3 text-xs uppercase tracking-wider text-slate-400">Adaptive spaced repetition</p>
                  <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-blue-400 to-purple-400" />
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-300">AI tutor insights</span>
                    <Brain className="h-5 w-5 text-purple-300" />
                  </div>
                  <p className="mt-4 text-base text-slate-300">
                    심화 학습이 필요한 개념 3가지를 발견했습니다. 요약과 실전 예제로 학습 흐름을 제안합니다.
                  </p>
                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="text-sm text-slate-200">Gradient Boosting</span>
                      <span className="text-xs font-semibold text-emerald-300">+24 mastery</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="text-sm text-slate-200">Bias Variance Trade-off</span>
                      <span className="text-xs font-semibold text-amber-300">Review</span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="text-sm text-slate-200">Confusion Matrix</span>
                      <span className="text-xs font-semibold text-blue-300">Quiz</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-300/80">이번 주 학습 시간</p>
                    <p className="mt-1 text-2xl font-semibold text-white">12시간 40분</p>
                  </div>
                  <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-slate-100">
                    스트릭 유지 중 · 9일
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-7 gap-3 text-center text-xs text-slate-400">
                  {['월', '화', '수', '목', '금', '토', '일'].map((day, idx) => (
                    <div key={day} className="flex flex-col items-center gap-2">
                      <span>{day}</span>
                      <div className="h-14 w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
                        <div
                          className="h-full w-full bg-gradient-to-b from-blue-400/80 to-purple-400/60"
                          style={{ height: `${50 + idx * 7}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="space-y-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Core capabilities</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">모든 학습 플로우를 하나로 묶다</h2>
            </div>
            <p className="max-w-xl text-base text-slate-300">
              AI 큐레이션, 복습 자동화, 시각화 도구까지. Memora는 학습 전 과정의 핵심 경험을 정교하게 다듬었습니다.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featureHighlights.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:border-white/20 hover:bg-white/10"
              >
                <div
                  className={`absolute -right-10 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-gradient-to-br ${feature.accent} opacity-60 blur-3xl transition group-hover:opacity-80`}
                />
                <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="relative mt-6 text-xl font-semibold text-white">{feature.title}</h3>
                <p className="relative mt-3 text-sm leading-relaxed text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="grid gap-10 rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur lg:grid-cols-[0.7fr,1fr]">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Learning workflow</p>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">감탄이 나오는 학습 시나리오</h2>
            <p className="text-base text-slate-300">
              학습자가 처음 목표를 설정하는 순간부터 실전 적용까지, Memora는 데이터 기반 인사이트와 AI 가이드를 통해
              자연스러운 몰입 흐름을 설계했습니다.
            </p>
            <ul className="space-y-3 text-sm text-slate-300/90">
              {quickstart.map((step) => (
                <li key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-blue-300" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/40 hover:bg-white/10"
            >
              5분 만에 온보딩 완료하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {learningWorkflows.map((item, index) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 shadow-[0_0_50px_rgba(56,189,248,0.08)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-lg font-semibold text-blue-200">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="team" className="space-y-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">Collaborative intelligence</p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">함께 배우고 성장하는 팀 학습</h2>
            </div>
            <p className="max-w-xl text-base text-slate-300">
              팀 학습 보드, 실시간 코멘트, 데이터 인사이트까지 — Memora는 개인 학습과 협업 학습의 경계를 부드럽게
              연결합니다.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {collaborativeHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-white/10 bg-white/5 p-8 transition hover:border-white/20 hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                  <item.icon className="h-6 w-6 text-blue-200" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-slate-300">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 p-10 shadow-[0_40px_120px_rgba(79,70,229,0.15)]">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-widest text-white/80">Ready to learn</p>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">당신의 학습이 가장 빛나는 순간을 만들어보세요</h2>
              <p className="max-w-2xl text-base text-slate-100/80">
                지금 등록하면 맞춤형 커리큘럼과 프리미엄 AI 학습 도구를 바로 이용할 수 있어요. 7일 동안 핵심 기능을
                제한 없이 체험해보고, 실제 학습 결과로 가능성을 확인해보세요.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-3 rounded-full bg-white px-8 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-blue-500/30 transition hover:bg-blue-50"
              >
                무료 체험 시작
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:border-white/60 hover:bg-white/10"
              >
                이미 계정이 있나요?
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
