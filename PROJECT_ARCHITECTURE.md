# Memora - AI 기반 범용 학습 플랫폼

## 프로젝트 개요
다중 AI 모델(Gemini, Claude, OpenAI)을 활용하여 개인 맞춤형 커리큘럼을 생성하고, 4가지 과학적 암기 기법을 통합한 범용 학습 플랫폼

## 기술 스택

### 프론트엔드
- **Framework**: Next.js 14+ (App Router)
- **UI Library**: React 18+
- **스타일링**: Tailwind CSS + shadcn/ui
- **상태 관리**: Zustand / React Context
- **차트/시각화**: D3.js, Recharts (마인드맵, 학습 진도)
- **타입 안정성**: TypeScript

### 백엔드
- **Runtime**: Node.js
- **API**: Next.js API Routes
- **데이터베이스**: MongoDB (Mongoose ODM)
- **인증**: JWT (jsonwebtoken, bcrypt)
- **캐싱**: Redis (선택적)

### AI 통합
- **OpenAI**: GPT-4 (커리큘럼 생성, 개념 정리)
- **Anthropic Claude**: Claude 3.5 Sonnet (심화 학습, 질의응답)
- **Google Gemini**: Gemini Pro (다국어 지원, 시각 자료 생성)

### 기타
- **파일 저장소**: AWS S3 / Cloudinary (이미지, 문서)
- **배포**: Vercel / Docker
- **모니터링**: Sentry (에러 추적)

---

## 핵심 기능

### 1. AI 커리큘럼 생성
- 사용자 목표 입력 → AI가 단계별 학습 경로 생성
- 주제별 난이도 분석 및 학습 시간 추정
- 개인화된 학습 속도 조정

### 2. 지식 생성 및 개념 정리
- AI가 핵심 개념 자동 추출 및 정리
- 다양한 형식 지원: 텍스트, 코드, 이미지, 다이어그램
- 연관 지식 자동 연결

### 3. 4가지 암기 기법 통합

#### A. 간격 반복 (Spaced Repetition)
- **알고리즘**: SuperMemo SM-2 또는 FSRS (Free Spaced Repetition Scheduler)
- **구현 방식**:
  - 각 카드별 ease factor, interval, repetition count 추적
  - 사용자 응답(Again, Hard, Good, Easy)에 따라 다음 복습 일정 계산
  - 일일 복습 목표 카드 수 설정
  - 통계: 복습률, 정답률, 학습 시간

#### B. 액티브 리콜 (Active Recall)
- **구현 방식**:
  - 플래시카드 시스템
  - AI 생성 질문 (객관식, 주관식, 코딩 문제)
  - 자가 평가 시스템
  - 즉각적인 피드백 및 해설

#### C. 기억의 궁전 (Memory Palace)
- **구현 방식**:
  - 3D/2D 가상 공간 생성 (Canvas API / Three.js)
  - 사용자 정의 위치에 지식 배치
  - 시각적 연상 이미지 생성 (AI 이미지 생성)
  - 공간 탐색 모드

#### D. 마인드맵/개념 연결
- **구현 방식**:
  - 지식 그래프 시각화 (D3.js force-directed graph)
  - 개념 간 자동 연결 제안 (AI 분석)
  - 인터랙티브 노드 추가/편집
  - 학습 경로 하이라이트

---

## 데이터베이스 스키마 설계

### Collections

#### 1. users
```javascript
{
  _id: ObjectId,
  email: String (unique, indexed),
  password: String (bcrypt hashed),
  username: String,
  profile: {
    avatar: String,
    timezone: String,
    learningGoals: [String]
  },
  preferences: {
    dailyReviewTarget: Number,
    preferredAI: String, // 'openai' | 'claude' | 'gemini'
    notificationsEnabled: Boolean
  },
  stats: {
    totalStudyTime: Number,
    cardsReviewed: Number,
    currentStreak: Number,
    longestStreak: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 2. curriculums
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', indexed),
  title: String,
  description: String,
  subject: String,
  difficulty: String, // 'beginner' | 'intermediate' | 'advanced'
  aiModel: String, // 생성에 사용된 AI 모델
  structure: [{
    moduleId: String,
    title: String,
    order: Number,
    estimatedHours: Number,
    topics: [{
      topicId: String,
      title: String,
      order: Number,
      conceptIds: [ObjectId] // ref: 'concepts'
    }]
  }],
  progress: {
    completedTopics: [String],
    currentModule: String,
    overallPercentage: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 3. concepts
```javascript
{
  _id: ObjectId,
  curriculumId: ObjectId (ref: 'curriculums', indexed),
  title: String,
  content: {
    text: String,
    code: String,
    images: [String], // URLs
    references: [String]
  },
  aiGenerated: {
    model: String,
    prompt: String,
    generatedAt: Date
  },
  tags: [String],
  difficulty: Number, // 1-10
  relatedConcepts: [ObjectId], // ref: 'concepts'
  createdAt: Date,
  updatedAt: Date
}
```

#### 4. flashcards
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', indexed),
  conceptId: ObjectId (ref: 'concepts'),
  type: String, // 'basic' | 'cloze' | 'image' | 'code'
  front: String,
  back: String,
  hint: String,

  // Spaced Repetition 데이터
  srs: {
    ease: Number, // 기본값: 2.5
    interval: Number, // 다음 복습까지 일 수
    repetitions: Number, // 연속 정답 횟수
    nextReview: Date,
    lastReviewed: Date,
    state: String // 'new' | 'learning' | 'review' | 'relearning'
  },

  // 학습 통계
  stats: {
    totalReviews: Number,
    correctCount: Number,
    incorrectCount: Number,
    averageResponseTime: Number
  },

  createdAt: Date,
  updatedAt: Date
}
```

#### 5. reviews (복습 기록)
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', indexed),
  flashcardId: ObjectId (ref: 'flashcards', indexed),
  rating: Number, // 1: Again, 2: Hard, 3: Good, 4: Easy
  responseTime: Number, // 밀리초
  previousInterval: Number,
  newInterval: Number,
  reviewedAt: Date (indexed)
}
```

#### 6. mindmaps
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', indexed),
  curriculumId: ObjectId (ref: 'curriculums'),
  title: String,
  nodes: [{
    nodeId: String,
    conceptId: ObjectId, // ref: 'concepts'
    label: String,
    position: { x: Number, y: Number },
    color: String,
    size: Number
  }],
  edges: [{
    edgeId: String,
    source: String, // nodeId
    target: String, // nodeId
    label: String,
    strength: Number // 연관도
  }],
  layout: String, // 'force' | 'tree' | 'radial'
  createdAt: Date,
  updatedAt: Date
}
```

#### 7. memorypalaces
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', indexed),
  curriculumId: ObjectId (ref: 'curriculums'),
  title: String,
  type: String, // 'room' | 'building' | 'path' | 'custom'
  backgroundImage: String,
  locations: [{
    locationId: String,
    position: { x: Number, y: Number, z: Number },
    conceptId: ObjectId, // ref: 'concepts'
    visualCue: {
      image: String,
      description: String,
      aiGenerated: Boolean
    },
    order: Number
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### 8. studysessions
```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: 'users', indexed),
  type: String, // 'review' | 'learn' | 'quiz'
  curriculumId: ObjectId (ref: 'curriculums'),
  cardsReviewed: Number,
  duration: Number, // 초
  accuracy: Number, // 백분율
  startedAt: Date,
  completedAt: Date
}
```

---

## API 구조 설계

### 인증 API
```
POST /api/auth/register - 회원가입
POST /api/auth/login - 로그인
POST /api/auth/logout - 로그아웃
GET  /api/auth/me - 현재 사용자 정보
PUT  /api/auth/profile - 프로필 업데이트
```

### 커리큘럼 API
```
POST /api/curriculums - 커리큘럼 생성 (AI)
GET  /api/curriculums - 사용자 커리큘럼 목록
GET  /api/curriculums/:id - 특정 커리큘럼 조회
PUT  /api/curriculums/:id - 커리큘럼 수정
DELETE /api/curriculums/:id - 커리큘럼 삭제
POST /api/curriculums/:id/generate-concepts - 개념 생성 (AI)
```

### 학습 콘텐츠 API
```
GET  /api/concepts/:id - 개념 조회
PUT  /api/concepts/:id - 개념 수정
POST /api/concepts/:id/generate-flashcards - 플래시카드 자동 생성 (AI)
GET  /api/concepts/:id/related - 연관 개념 조회
```

### 플래시카드 & 복습 API
```
GET  /api/flashcards/due - 오늘 복습할 카드 목록
POST /api/flashcards - 플래시카드 생성
GET  /api/flashcards/:id - 플래시카드 조회
PUT  /api/flashcards/:id - 플래시카드 수정
DELETE /api/flashcards/:id - 플래시카드 삭제
POST /api/reviews - 복습 기록 및 SRS 업데이트
GET  /api/reviews/stats - 복습 통계
```

### 마인드맵 API
```
POST /api/mindmaps - 마인드맵 생성
GET  /api/mindmaps/:id - 마인드맵 조회
PUT  /api/mindmaps/:id - 마인드맵 업데이트
DELETE /api/mindmaps/:id - 마인드맵 삭제
POST /api/mindmaps/:id/auto-connect - AI 기반 자동 연결
```

### 기억의 궁전 API
```
POST /api/memory-palaces - 기억의 궁전 생성
GET  /api/memory-palaces/:id - 기억의 궁전 조회
PUT  /api/memory-palaces/:id - 업데이트
DELETE /api/memory-palaces/:id - 삭제
POST /api/memory-palaces/:id/generate-cues - AI 시각적 단서 생성
```

### AI API
```
POST /api/ai/curriculum - 커리큘럼 생성
POST /api/ai/concept - 개념 설명 생성
POST /api/ai/flashcard - 플래시카드 생성
POST /api/ai/quiz - 퀴즈 생성
POST /api/ai/visualize - 시각 자료 생성
```

### 통계 API
```
GET /api/stats/dashboard - 대시보드 통계
GET /api/stats/progress - 학습 진도
GET /api/stats/retention - 기억 유지율
GET /api/stats/heatmap - 학습 히트맵
```

---

## 폴더 구조

```
memora/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── curriculums/
│   │   │   ├── review/
│   │   │   ├── mindmap/
│   │   │   ├── memory-palace/
│   │   │   └── stats/
│   │   ├── api/                  # API Routes
│   │   │   ├── auth/
│   │   │   ├── curriculums/
│   │   │   ├── concepts/
│   │   │   ├── flashcards/
│   │   │   ├── reviews/
│   │   │   ├── mindmaps/
│   │   │   ├── memory-palaces/
│   │   │   ├── ai/
│   │   │   └── stats/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/               # React 컴포넌트
│   │   ├── auth/
│   │   ├── curriculum/
│   │   ├── flashcard/
│   │   ├── mindmap/
│   │   ├── memory-palace/
│   │   ├── review/
│   │   ├── stats/
│   │   └── ui/                   # shadcn/ui 컴포넌트
│   │
│   ├── lib/                      # 유틸리티 & 설정
│   │   ├── db/
│   │   │   ├── mongodb.ts
│   │   │   └── models/
│   │   │       ├── User.ts
│   │   │       ├── Curriculum.ts
│   │   │       ├── Concept.ts
│   │   │       ├── Flashcard.ts
│   │   │       ├── Review.ts
│   │   │       ├── Mindmap.ts
│   │   │       ├── MemoryPalace.ts
│   │   │       └── StudySession.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── openai.ts
│   │   │   ├── claude.ts
│   │   │   ├── gemini.ts
│   │   │   └── router.ts         # AI 모델 라우팅
│   │   │
│   │   ├── srs/
│   │   │   ├── sm2.ts            # SuperMemo SM-2 알고리즘
│   │   │   ├── fsrs.ts           # FSRS 알고리즘
│   │   │   └── scheduler.ts
│   │   │
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   └── middleware.ts
│   │   │
│   │   └── utils/
│   │       ├── errors.ts
│   │       └── validators.ts
│   │
│   ├── hooks/                    # Custom React Hooks
│   │   ├── useAuth.ts
│   │   ├── useCurriculum.ts
│   │   ├── useFlashcard.ts
│   │   └── useReview.ts
│   │
│   ├── store/                    # 상태 관리 (Zustand)
│   │   ├── authStore.ts
│   │   ├── curriculumStore.ts
│   │   └── reviewStore.ts
│   │
│   ├── types/                    # TypeScript 타입 정의
│   │   ├── auth.ts
│   │   ├── curriculum.ts
│   │   ├── flashcard.ts
│   │   └── api.ts
│   │
│   └── styles/
│       └── globals.css
│
├── public/
│   ├── images/
│   └── icons/
│
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 구현 단계

### Phase 1: 기반 설정 (1-2일)
1. Next.js 프로젝트 초기화
2. MongoDB 연결 및 모델 정의
3. JWT 인증 시스템 구현
4. 기본 UI 컴포넌트 설정 (shadcn/ui)

### Phase 2: AI 통합 (2-3일)
1. OpenAI, Claude, Gemini API 클라이언트 구현
2. 커리큘럼 생성 로직
3. 개념 정리 자동 생성
4. 플래시카드 자동 생성

### Phase 3: 간격 반복 시스템 (2-3일)
1. SM-2/FSRS 알고리즘 구현
2. 플래시카드 복습 시스템
3. 일일 복습 스케줄러
4. 통계 대시보드

### Phase 4: 액티브 리콜 (1-2일)
1. 플래시카드 UI/UX
2. 자가 평가 시스템
3. AI 생성 퀴즈

### Phase 5: 마인드맵 (2-3일)
1. D3.js 그래프 시각화
2. 드래그 앤 드롭 편집
3. AI 자동 연결 제안

### Phase 6: 기억의 궁전 (3-4일)
1. Canvas/Three.js 공간 렌더링
2. 위치 기반 지식 배치
3. AI 시각적 단서 생성

### Phase 7: 최적화 & 배포 (2-3일)
1. 성능 최적화
2. SEO 설정
3. 배포 및 테스트

---

## 주요 라이브러리

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "mongoose": "^8.0.0",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "openai": "^4.0.0",
    "@anthropic-ai/sdk": "^0.9.0",
    "@google/generative-ai": "^0.1.0",
    "d3": "^7.8.0",
    "three": "^0.159.0",
    "@react-three/fiber": "^8.15.0",
    "recharts": "^2.10.0",
    "zustand": "^4.4.0",
    "zod": "^3.22.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest"
  }
}
```

---

## 환경 변수 (.env.local)

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/memora
# or MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/memora

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Optional
REDIS_URL=redis://localhost:6379
AWS_S3_BUCKET=memora-assets
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
