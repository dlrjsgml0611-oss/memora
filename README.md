# Memora - AI-Powered Learning Platform

![Memora Banner](https://via.placeholder.com/1200x400/3b82f6/ffffff?text=Memora+-+AI+Learning+Platform)

## 개요

Memora는 최신 AI 기술과 과학적으로 검증된 암기 기법을 결합한 차세대 범용 학습 플랫폼입니다. OpenAI, Anthropic Claude, Google Gemini를 활용하여 개인 맞춤형 커리큘럼을 생성하고, 4가지 강력한 학습 기법을 통해 효율적인 지식 습득을 지원합니다.

## 주요 기능

### 🤖 다중 AI 모델 통합
- **OpenAI GPT-4**: 구조화된 커리큘럼 및 플래시카드 생성
- **Anthropic Claude**: 심화 학습 컨텐츠 및 개념 분석
- **Google Gemini**: 다국어 지원 및 시각 자료 생성

### 📚 4가지 과학적 학습 기법

#### 1. 간격 반복 (Spaced Repetition)
- SuperMemo SM-2 알고리즘 구현
- 망각 곡선을 고려한 최적 복습 스케줄
- 개인별 학습 속도 자동 조정

#### 2. 액티브 리콜 (Active Recall)
- AI 생성 플래시카드 시스템
- 즉각적인 피드백 제공
- 다양한 카드 타입 지원 (기본, Cloze, 이미지, 코드)

#### 3. 마인드맵 / 개념 연결
- D3.js 기반 인터랙티브 시각화
- AI 기반 자동 개념 연결
- 다양한 레이아웃 지원 (Force, Tree, Radial)

#### 4. 기억의 궁전 (Memory Palace)
- 공간 기억술 활용
- 사용자 정의 가상 공간
- AI 생성 시각적 단서

## 기술 스택

### Frontend
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**
- **Tailwind CSS** + shadcn/ui
- **D3.js** (데이터 시각화)
- **Zustand** (상태 관리)

### Backend
- **Node.js**
- **Next.js API Routes**
- **MongoDB** (Mongoose ODM)
- **JWT** (인증)

### AI Integration
- **OpenAI API** (GPT-4)
- **Anthropic Claude API** (Claude 3.5 Sonnet)
- **Google Gemini API** (Gemini Pro)

## 설치 및 실행

### 필수 요구사항
- Node.js 18 이상
- MongoDB (로컬 또는 MongoDB Atlas)
- AI API 키 (OpenAI, Anthropic, Google)

### 설치

1. 저장소 클론
```bash
git clone https://github.com/yourusername/memora.git
cd memora
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
```bash
cp .env.example .env.local
```

`.env.local` 파일을 열고 다음 변수들을 설정하세요:
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/memora
# or MongoDB Atlas
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/memora

# JWT
JWT_SECRET=your-super-secret-key-change-this-in-production
JWT_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열어주세요.

### 프로덕션 빌드
```bash
npm run build
npm start
```

### 개발 검증 명령
```bash
npm run lint
npm run typecheck
npm run test
npm run build:webpack
```

## 프로젝트 구조

```
memora/
├── app/                      # Next.js App Router
│   ├── api/                  # API Routes
│   │   ├── auth/            # 인증 API
│   │   ├── flashcards/      # 플래시카드 API
│   │   ├── reviews/         # 복습 기록 API
│   │   └── ...
│   ├── (auth)/              # 인증 페이지
│   ├── (dashboard)/         # 대시보드 페이지
│   └── page.tsx             # 홈페이지
│
├── components/              # React 컴포넌트
│   ├── auth/
│   ├── flashcard/
│   ├── mindmap/
│   └── ui/                  # 공통 UI 컴포넌트
│
├── lib/                     # 유틸리티 & 설정
│   ├── db/                  # 데이터베이스
│   │   ├── mongodb.ts
│   │   └── models/         # Mongoose 모델
│   ├── ai/                  # AI 통합
│   │   ├── openai.ts
│   │   ├── claude.ts
│   │   ├── gemini.ts
│   │   └── router.ts
│   ├── srs/                 # 간격 반복 알고리즘
│   │   ├── sm2.ts
│   │   └── scheduler.ts
│   ├── auth/                # 인증
│   └── utils/               # 유틸리티
│
├── types/                   # TypeScript 타입
└── public/                  # 정적 파일
```

## API 문서

### 인증 API
```
POST /api/auth/register  - 회원가입
POST /api/auth/login     - 로그인
POST /api/auth/logout    - 로그아웃
GET  /api/auth/me        - 사용자 정보 조회
PUT  /api/auth/me        - 사용자 정보 수정
```

인증은 `HttpOnly` 쿠키 기반으로 처리되며, 클라이언트 localStorage에 JWT를 저장하지 않습니다.

### 플래시카드 API
```
GET    /api/flashcards         - 플래시카드 목록
POST   /api/flashcards         - 플래시카드 생성
GET    /api/flashcards/due     - 복습 대상 카드 조회
GET    /api/flashcards/:id     - 특정 카드 조회
PUT    /api/flashcards/:id     - 카드 수정
DELETE /api/flashcards/:id     - 카드 삭제
```

### 복습 API
```
POST /api/reviews  - 복습 기록 (SRS 업데이트 포함)
```

## SM-2 알고리즘

Memora는 SuperMemo SM-2 알고리즘을 사용하여 최적의 복습 스케줄을 계산합니다.

### 평가 척도
- **1 (Again)**: 완전히 기억하지 못함
- **2 (Hard)**: 어렵게 기억함
- **3 (Good)**: 적절한 난이도로 기억함
- **4 (Easy)**: 쉽게 기억함

### 알고리즘 특징
- Ease Factor 자동 조정 (최소 1.3)
- 간격 계산: 1일 → 6일 → (이전 간격 × ease factor)
- 틀린 경우 자동으로 재학습 상태로 전환

## 기여하기

버그 리포트나 기능 제안은 [Issues](https://github.com/yourusername/memora/issues)에 등록해주세요.

Pull Request는 언제나 환영합니다!

## 라이선스

MIT License

## 연락처

문의사항이 있으시면 이메일로 연락주세요: your-email@example.com

---

**Memora** - Learn Smarter, Remember Better 🧠✨
