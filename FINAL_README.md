# Memora - 완성된 AI 학습 플랫폼 🎓

## 🎉 프로젝트 완성!

Memora는 이제 완전히 작동하는 AI 기반 학습 플랫폼입니다!

## ✅ 구현 완료된 기능

### 1. 인증 시스템
- ✅ JWT 기반 회원가입/로그인
- ✅ 보안된 세션 관리
- ✅ 자동 로그인 유지 (Zustand persist)

### 2. 커리큘럼 관리
- ✅ AI 자동 커리큘럼 생성 (OpenAI/Claude/Gemini)
- ✅ 모듈 및 토픽 구조화
- ✅ 학습 진도 추적
- ✅ 커리큘럼 상세 페이지

### 3. 플래시카드 시스템
- ✅ 수동 플래시카드 생성
- ✅ AI 자동 플래시카드 생성
- ✅ 4가지 카드 타입 (기본, Cloze, 코드, 이미지)
- ✅ 플래시카드 목록 및 관리

### 4. 간격 반복 학습 (SRS)
- ✅ SuperMemo SM-2 알고리즘 완전 구현
- ✅ 4단계 난이도 평가 (Again, Hard, Good, Easy)
- ✅ 자동 복습 스케줄링
- ✅ 학습 상태 추적 (new, learning, review, relearning)

### 5. 복습 시스템
- ✅ 오늘의 복습 카드 자동 선택
- ✅ 인터랙티브 복습 인터페이스
- ✅ 실시간 통계 표시
- ✅ 응답 시간 측정

### 6. AI 통합
- ✅ OpenAI GPT-4 통합
- ✅ Anthropic Claude 3.5 통합
- ✅ Google Gemini Pro 통합
- ✅ AI 모델 자동 라우팅
- ✅ 개념 설명 생성
- ✅ 플래시카드 자동 생성

### 7. 통계 및 분석
- ✅ 학습 시간 추적
- ✅ 복습 정확도 계산
- ✅ 학습 스트릭 (연속 일수)
- ✅ 달성 과제 시스템
- ✅ 상세 통계 대시보드

### 8. 사용자 설정
- ✅ 프로필 관리
- ✅ 학습 설정 (일일 목표, 선호 AI)
- ✅ 알림 설정
- ✅ 계정 통계 확인

## 📱 페이지 구조

### 공개 페이지
- `/` - 랜딩 페이지
- `/login` - 로그인
- `/register` - 회원가입

### 대시보드 (인증 필요)
- `/dashboard` - 메인 대시보드
- `/review` - 플래시카드 복습
- `/flashcards` - 플래시카드 관리
- `/curriculums` - 커리큘럼 목록
- `/curriculums/[id]` - 커리큘럼 상세 (AI 개념 생성, 플래시카드 자동 생성)
- `/stats` - 학습 통계
- `/settings` - 사용자 설정
- `/mindmap` - 마인드맵 (예정)
- `/memory-palace` - 기억의 궁전 (예정)

## 🚀 빠른 시작

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 수정하세요:

```env
# MongoDB (필수)
MONGODB_URI=mongodb://localhost:27017/memora

# JWT (필수)
JWT_SECRET=your-secret-key-change-in-production

# AI API 키 (최소 하나 필요)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# 앱 URL
NEXT_PUBLIC_APP_URL=http://localhost:5000
```

### 3. MongoDB 실행
로컬 MongoDB를 실행하거나 MongoDB Atlas를 사용하세요.

### 4. 개발 서버 실행
```bash
npm run dev -- -p 5000
```

### 5. 브라우저에서 확인
http://localhost:5000

## 🎯 실제 사용 플로우

### 첫 사용자 시나리오

1. **회원가입** (`/register`)
   - 이메일, 비밀번호, 사용자 이름 입력
   - 자동으로 대시보드로 이동

2. **커리큘럼 생성** (`/curriculums`)
   - "새 커리큘럼" 클릭
   - 주제: "파이썬 프로그래밍"
   - 학습 목표: "파이썬 기초부터 중급까지 배우고 싶습니다"
   - AI 모델 선택 (OpenAI 권장)
   - AI가 10-30초 안에 체계적인 커리큘럼 생성

3. **개념 학습** (`/curriculums/[id]`)
   - 생성된 커리큘럼의 "학습 시작" 클릭
   - 각 토픽의 "개념 설명" 버튼 클릭
   - AI가 상세한 설명 생성 (Claude 권장)

4. **플래시카드 생성** (2가지 방법)
   - **자동**: 커리큘럼 상세 페이지에서 자동 생성
   - **수동**: `/flashcards`에서 직접 생성

5. **복습하기** (`/review`)
   - 매일 오늘의 복습 카드 표시
   - 답변 확인 후 난이도 선택
   - SM-2 알고리즘이 다음 복습 일정 자동 계산

6. **진도 확인** (`/stats`)
   - 학습 시간, 정확도, 스트릭 확인
   - 달성 과제 잠금 해제

## 🔥 핵심 기능 데모

### AI 커리큘럼 생성
```
입력:
- 주제: "React 프론트엔드 개발"
- 학습 목표: "React로 웹 애플리케이션을 만들고 싶습니다"
- 난이도: 중급
- AI: OpenAI

출력 (예시):
Module 1: React 기초
  - Topic 1.1: JSX 문법
  - Topic 1.2: 컴포넌트와 Props
  - Topic 1.3: State와 Lifecycle

Module 2: React Hooks
  - Topic 2.1: useState, useEffect
  - Topic 2.2: Custom Hooks
  ...
```

### SM-2 알고리즘 작동
```
카드 1회 복습 (Good):
- 다음 복습: 1일 후

카드 2회 복습 (Good):
- 다음 복습: 6일 후

카드 3회 복습 (Good):
- 다음 복습: 15일 후 (6 × ease factor 2.5)

카드 복습 실패 (Again):
- 다음 복습: 즉시 (재학습 모드)
- Ease factor 감소
```

### 학습 스트릭
```
연속 3일 학습:
🔥 3일 스트릭!

하루 건너뛰면:
스트릭 초기화 → 0일
```

## 🛠️ 기술 스택 상세

### Frontend
- **Next.js 16** - App Router, Server Components
- **React 19** - UI 렌더링
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 스타일링
- **Zustand** - 클라이언트 상태 관리

### Backend
- **Next.js API Routes** - RESTful API
- **MongoDB** - NoSQL 데이터베이스
- **Mongoose** - ODM
- **JWT** - 인증
- **bcrypt** - 비밀번호 해싱

### AI
- **OpenAI API** - GPT-4
- **Anthropic API** - Claude 3.5 Sonnet
- **Google AI** - Gemini Pro

### Algorithms
- **SuperMemo SM-2** - 간격 반복 알고리즘

## 📊 데이터베이스 스키마

```
Users
- 인증 정보 (email, password)
- 프로필 (username, avatar, goals)
- 설정 (dailyReviewTarget, preferredAI)
- 통계 (totalStudyTime, cardsReviewed, streak)

Curriculums
- 기본 정보 (title, description, subject, difficulty)
- AI 메타데이터 (aiModel, generatedAt)
- 구조 (modules → topics → concepts)
- 진도 (completedTopics, overallPercentage)

Flashcards
- 콘텐츠 (front, back, hint, type)
- SRS 데이터 (ease, interval, repetitions, nextReview, state)
- 통계 (totalReviews, correctCount, incorrectCount)

Reviews
- 복습 기록 (rating, responseTime)
- SRS 업데이트 (previousInterval, newInterval)
- 타임스탬프 (reviewedAt)

Concepts
- AI 생성 콘텐츠 (text, code, images)
- 메타데이터 (difficulty, tags, relatedConcepts)

Mindmaps (준비 중)
- 노드 및 엣지 정보
- 레이아웃 설정

MemoryPalaces (준비 중)
- 공간 정보
- 시각적 단서
```

## 🔮 향후 계획

### Phase 2 (추가 기능)
- [ ] D3.js 마인드맵 시각화
- [ ] Three.js 기억의 궁전 3D
- [ ] 이미지 업로드 기능
- [ ] 오디오 플래시카드
- [ ] 모바일 앱 (React Native)

### Phase 3 (고급 기능)
- [ ] 협업 기능 (친구와 커리큘럼 공유)
- [ ] 리더보드
- [ ] 주간/월간 학습 리포트
- [ ] AI 맞춤형 학습 경로 추천
- [ ] 음성 인식 복습

## 🐛 알려진 이슈

1. AI API 키 없이 실행하면 커리큘럼 생성 실패
   - 해결: 최소 하나의 API 키 설정 필요

2. MongoDB 연결 실패
   - 해결: MongoDB 서버 실행 확인

3. Tailwind CSS 경고
   - 무시 가능 (기능에 영향 없음)

## 💡 팁

1. **API 비용 절감**
   - OpenAI API가 가장 저렴
   - 테스트 시 짧은 커리큘럼 생성

2. **최적의 복습**
   - 매일 같은 시간에 복습
   - 스트릭 유지하기
   - 하루 목표 20-50개 카드

3. **효과적인 플래시카드**
   - 간결한 질문
   - 명확한 답변
   - 힌트 활용

## 📞 지원

문제 발생 시:
1. MongoDB 연결 확인
2. API 키 확인
3. 콘솔 에러 메시지 확인
4. GitHub Issues에 보고

---

**Memora로 더 스마트하게 학습하세요!** 🚀📚✨
