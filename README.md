# KPI Tracker

팀별 KPI 추적 및 금요일 팀장 회의 보고 시스템

## 주요 기능

- **팀/KPI 관리**: 팀 추가, KPI 항목 설정
- **주간 보고서 입력**: PLAN/DO/CHECK/ACTION 양식
- **보고 대시보드**: 팀 + 날짜 필터로 데이터 조회
- **달성률 자동 계산**
- **Google Sheets 마이그레이션**: 기존 데이터 가져오기

## 기술 스택

- **프론트엔드**: Next.js 14 + React + TypeScript + Tailwind CSS
- **백엔드**: Next.js API Routes
- **데이터베이스**: Supabase (PostgreSQL)
- **배포**: Vercel

## 시작하기

### 1. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에서 `supabase-schema.sql` 파일 실행
3. Project Settings → API에서 URL과 anon key 복사

### 2. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local` 파일을 열고 Supabase URL과 anon key 입력:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 의존성 설치

```bash
npm install
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 앱 확인

### 5. 데이터 마이그레이션 (선택사항)

기존 Google Sheets 데이터가 있다면:
1. 앱에서 "마이그레이션" 메뉴 클릭
2. Google Sheets URL 입력 또는 CSV 파일 업로드
3. 마이그레이션 시작

## 배포

### Vercel (추천)

1. [Vercel](https://vercel.com)에서 GitHub 레포지토리 연결
2. 환경 변수 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Deploy

### Supabase Database 제한사항 (무료 tier)

- 500MB 스토리지
- 60분 연결 제한
- 동시 접속 60명 제한

충분히 소규모 팀 사용 가능

## 프로젝트 구조

```
kpi-tracker/
├── app/
│   ├── layout.tsx          # 레이아웃 (네비게이션)
│   ├── page.tsx           # 대시보드
│   ├── globals.css        # 글로벌 스타일
│   ├── kpi/page.tsx       # KPI 관리
│   ├── reports/page.tsx  # 보고서 입력
│   └── migrate/page.tsx  # 데이터 마이그레이션
├── lib/
│   └── supabase.ts       # Supabase 클라이언트
├── types/
│   └── index.ts          # TypeScript 타입 정의
├── supabase-schema.sql   # 데이터베이스 스키마
└── .env.local.example    # 환경 변수 예제
```

## 사용법

### 1. 초기 설정

1. **팀 추가**: KPI 관리 → 팀 추가
2. **KPI 추가**: KPI 관리 → KPI 추가 (팀 선택, 목표 설정)

### 2. 주간 보고

1. **보고서 입력** 메뉴
2. 팀과 KPI 선택
3. 달성 수치 입력 (자동 달성률 계산)
4. PLAN/DO/CHECK/ACTION 양식 작성
5. 저장

### 3. 회의 보고

1. **대시보드** 메뉴
2. 팀 선택 (전체 또는 특정 팀)
3. 날짜 범위 설정
4. 해당 데이터 확인 후 회의 진행

## 라이선스

MIT
