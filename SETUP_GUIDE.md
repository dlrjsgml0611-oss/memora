# Memora 설치 가이드

## 시작하기 전에

다음 항목들이 설치되어 있어야 합니다:
- Node.js 18 이상
- MongoDB (로컬 또는 MongoDB Atlas 계정)
- AI API 키 (최소 하나 이상 - OpenAI, Anthropic, 또는 Google)

## 1단계: 프로젝트 복제 및 의존성 설치

```bash
cd memora
npm install
```

## 2단계: MongoDB 설정

### 옵션 A: 로컬 MongoDB 사용

1. MongoDB를 설치합니다: https://www.mongodb.com/try/download/community
2. MongoDB 서비스를 시작합니다:
   ```bash
   # macOS
   brew services start mongodb-community

   # Linux
   sudo systemctl start mongod

   # Windows
   # MongoDB Compass 또는 서비스 관리자에서 시작
   ```

### 옵션 B: MongoDB Atlas (클라우드) 사용

1. https://www.mongodb.com/cloud/atlas 에서 무료 계정 생성
2. 새 클러스터 생성
3. Database Access에서 사용자 추가
4. Network Access에서 IP 주소 허용 (개발 시 0.0.0.0/0)
5. Connect > Connect your application에서 연결 문자열 복사

## 3단계: 환경 변수 설정

`.env.local` 파일이 이미 생성되어 있습니다. 다음 값들을 설정하세요:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/memora
# 또는 Atlas 사용 시:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/memora

# JWT (프로덕션에서는 반드시 변경하세요!)
JWT_SECRET=memora-super-secret-key-change-this-in-production-min-32-chars
JWT_EXPIRES_IN=7d

# AI API 키 (최소 하나 이상 설정)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 4단계: AI API 키 발급

### OpenAI API 키 (권장)
1. https://platform.openai.com 방문
2. 계정 생성 및 로그인
3. API Keys 메뉴에서 새 키 생성
4. `.env.local`의 `OPENAI_API_KEY`에 입력

### Anthropic Claude API 키
1. https://console.anthropic.com 방문
2. 계정 생성 및 로그인
3. API Keys에서 새 키 생성
4. `.env.local`의 `ANTHROPIC_API_KEY`에 입력

### Google Gemini API 키
1. https://makersuite.google.com/app/apikey 방문
2. Google 계정으로 로그인
3. API 키 생성
4. `.env.local`의 `GOOGLE_AI_API_KEY`에 입력

**참고**: 최소 하나의 AI API 키만 있으면 됩니다. 커리큘럼 생성 시 해당 AI 모델을 선택하면 됩니다.

## 5단계: 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3000 을 열어주세요.

## 6단계: 첫 사용자 등록

1. 홈페이지에서 "시작하기" 클릭
2. 이메일, 비밀번호, 사용자 이름 입력
3. 회원가입 완료!

## 기능 테스트

### 1. 커리큘럼 생성 테스트
1. 대시보드에서 "커리큘럼" 메뉴 클릭
2. "+ 새 커리큘럼" 버튼 클릭
3. 주제와 학습 목표 입력 (예: "파이썬 기초", "파이썬 프로그래밍 기초부터 중급까지 배우고 싶습니다")
4. AI 모델 선택 (API 키가 설정된 모델)
5. "커리큘럼 생성하기" 클릭
6. AI가 커리큘럼을 자동 생성합니다 (약 10-30초 소요)

### 2. 플래시카드 복습 테스트
1. 먼저 플래시카드를 생성해야 합니다
2. "복습하기" 메뉴 클릭
3. 카드가 표시되면 "답변 확인하기" 클릭
4. 난이도 선택 (전혀, 어려움, 좋음, 쉬움)
5. SM-2 알고리즘이 자동으로 다음 복습 일정 계산

### 3. 학습 통계 확인
1. "통계" 메뉴 클릭
2. 학습 시간, 복습한 카드 수, 스트릭 등 확인

## 트러블슈팅

### MongoDB 연결 오류
```
Error: MongoServerError: Authentication failed
```
- `.env.local`의 MONGODB_URI가 정확한지 확인
- MongoDB Atlas 사용 시 IP 주소가 허용되었는지 확인
- 사용자 이름/비밀번호가 정확한지 확인

### AI API 오류
```
Error: Failed to generate curriculum
```
- API 키가 올바르게 설정되었는지 확인
- API 사용량 한도를 초과하지 않았는지 확인
- 다른 AI 모델로 시도해보세요

### 포트 충돌
```
Error: Port 3000 is already in use
```
- 다른 포트 사용:
  ```bash
  npm run dev -- -p 3001
  ```
- 또는 기존 프로세스 종료

## 다음 단계

1. 커리큘럼을 생성하고 학습 시작
2. 매일 복습하여 스트릭 유지
3. 마인드맵과 기억의 궁전 기능 출시 대기 (Coming Soon)

## 도움이 필요하신가요?

문제가 발생하면 다음을 확인해주세요:
1. Node.js 버전: `node -v` (18 이상이어야 함)
2. MongoDB 연결: MongoDB Compass로 연결 테스트
3. 환경 변수: `.env.local` 파일이 올바르게 설정되었는지 확인

즐거운 학습 되세요! 🎉
