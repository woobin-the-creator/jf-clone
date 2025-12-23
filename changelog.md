# Changelog

## 실제 수정 및 생성된 파일 목록

### 생성된 파일
- `src/types/menu1.types.ts` - Menu1 타입 정의
- `src/utils/menu1.utils.ts` - Menu1 유틸리티 함수 및 상수
- `src/hooks/useMenu1State.ts` - UI 상태 관리 커스텀 훅
- `src/hooks/useMenu1Data.ts` - 서버 데이터 관리 커스텀 훅
- `src/components/menu1/RequestTable.tsx` - 요청 테이블 컴포넌트
- `src/components/menu1/SelectAssignee.tsx` - 담당자 선택 컴포넌트
- `src/pages/Menu1.tsx` - Menu1 메인 페이지 (리팩토링됨)

### 삭제된 파일/폴더
- `src/app/` 폴더 전체 삭제 (Next.js 구조 제거)

---

## 세션 작업 내용

### 1. Menu1 페이지 모듈화 (2024-12-18)

#### 배경
- 기존 Menu1 페이지가 약 600줄의 단일 파일로 구성되어 유지보수가 어려움
- 코드 재사용성 부족 및 책임 분리 필요

#### 작업 내용

##### 1.1 타입 정의 분리 (`src/types/menu1.types.ts`)
- `RequestSubmission` 인터페이스
- `RequestSubmissionResponse` 인터페이스
- `Calendar` 인터페이스
- `FilterState` 인터페이스
- **목적**: 타입 정의를 중앙 집중화하여 일관성 유지

##### 1.2 유틸리티 함수 및 상수 분리 (`src/utils/menu1.utils.ts`)
**상수:**
- `FIXED_WIDTHS` - 테이블 컬럼 고정 너비
- `ITEMS_PER_PAGE` - 페이지당 아이템 수 (15)
- `REFRESH_INTERVAL` - 자동 새로고침 간격 (30초)

**유틸리티 함수:**
- `parseDateParam()` - URL 쿼리 파라미터를 Date 객체로 변환
- `isSameDate()` - 두 Date 객체 비교
- `formatDate()` - 날짜를 yyyy-MM-dd 형식으로 포맷팅
- `getUniqueValues()` - 컬럼별 고유 값 추출
- `filterData()` - 필터 조건에 따라 데이터 필터링
- `downloadCSV()` - CSV 파일 생성 및 다운로드
- `calculateMaxAssigneeWidth()` - 담당자 컬럼 최대 너비 계산

##### 1.3 UI 상태 관리 Hook 생성 (`src/hooks/useMenu1State.ts`)
**관리하는 상태:**
- 필터 상태 (검색어, 날짜 필터, 컬럼 필터)
- 페이지네이션 상태 (현재 페이지, 전환 애니메이션)
- URL 쿼리 파라미터 동기화

**주요 기능:**
- 검색어 적용 및 URL 동기화
- 컬럼 필터링 및 정렬
- 페이지 전환 애니메이션 관리
- 필터 변경 시 자동으로 첫 페이지로 리셋

##### 1.4 서버 데이터 관리 Hook 생성 (`src/hooks/useMenu1Data.ts`)
**관리하는 데이터:**
- 요청 제출 목록 (Request Submissions)
- 직원 정보 목록 (Calendar/Employee Info)
- 담당자 업데이트 Mutation

**주요 기능:**
- 자동 새로고침 (30초마다, 윈도우 포커스 시)
- 승인 상태 갱신 API 호출
- 담당자 배정 업데이트
- 에러 처리 및 토스트 알림 (401 에러 등)

##### 1.5 테이블 컴포넌트 생성 (`src/components/menu1/RequestTable.tsx`)
**포함된 기능:**
- 테이블 헤더 (ColumnHeader 사용)
- 테이블 바디 (데이터 행 렌더링)
- 로딩 스켈레톤 (15개 행)
- 빈 상태 처리
- 페이지 전환 애니메이션

**특징:**
- Header, Body, Skeleton을 하나의 파일로 통합
- 재사용성보다 가독성 우선 (Menu1 전용 컴포넌트)

##### 1.6 메인 페이지 리팩토링 (`src/pages/Menu1.tsx`)
**변경 사항:**
- 600줄 → 155줄 (약 74% 감소)
- 로직을 hooks로 분리, 조합만 담당
- 명확한 섹션 구분 (DATA, STATE, FILTERING, PAGINATION, HANDLERS, RENDER)

**결과:**
- 코드 가독성 향상
- 유지보수 용이성 증대
- 각 모듈의 단일 책임 명확화

---

### 2. SelectAssignee 컴포넌트 추가 및 수정 (2024-12-18)

#### 배경
- 담당자가 배정된 후 상태가 변경되면 더 이상 수정할 수 없는 제약 존재
- 담당자 재배정 필요성 발생

#### 수정 내용

**Before:**
```tsx
const isManager = user?.auth === "MANAGER";
const isKnoxApprDone = submission.status === "JOB 검토,배정 대기";
const canSelect = isManager && isKnoxApprDone;  // 두 조건 모두 필요
```

**After:**
```tsx
const isManager = user?.auth === "MANAGER";
// 상태 체크 조건 제거 - 매니저면 언제든지 수정 가능
const canSelect = isManager;
```

**효과:**
- 매니저는 상태와 관계없이 언제든지 담당자 수정 가능
- 담당자 재배정 워크플로우 개선

---

### 3. Next.js 구조를 React + Vite 구조로 변경 (2024-12-18)

#### 배경
- 프로젝트가 실제로는 React + Vite 기반인데 Next.js 구조로 잘못 생성됨
- 파일 위치 및 코드 스타일 불일치

#### 변경 사항

##### 3.1 파일 위치 변경
```
❌ src/app/menu1/page.tsx (Next.js App Router)
✅ src/pages/Menu1.tsx (React Router)
```

##### 3.2 "use client" 디렉티브 제거
```diff
- "use client";

  import { useState, useMemo } from "react";
```
- Next.js 13+ App Router 전용 지시문 제거
- 순수 React 컴포넌트로 변경

##### 3.3 app/ 폴더 삭제
- `src/app/` 폴더 전체 삭제
- Next.js 관련 구조 완전 제거

---

### 4. 목업 파일 생성 (2024-12-18)

#### 생성된 목업 파일 목록

**Pages:**
- `src/pages/Menu2.tsx`
- `src/pages/Dashboard.tsx`

**Components:**
- `src/components/menu1/ColumnHeader.tsx`
- `src/components/menu1/CommentModal.tsx`
- `src/components/menu1/DetailedInfoModal.tsx`
- `src/components/menu1/FilterControls.tsx`
- `src/components/menu1/PaginationControls.tsx`
- `src/components/menu1/DetailedInfoModal/Timeline.types.ts`
- `src/components/menu1/DetailedInfoModal/Timeline.utils.ts`
- `src/components/menu1/DetailedInfoModal/TimelineViewer.tsx`
- `src/components/menu1/DetailedInfoModal/UseTimeline.ts`

**Hooks:**
- `src/hooks/useAuth.tsx`
- `src/hooks/use-toast.ts`

**Lib:**
- `src/lib/queryClient.ts`
- `src/lib/utils.ts`

**Core:**
- `src/App.tsx`
- `src/main.tsx`
- `src/index.css`
- `src/vite-env.d.ts`

**Types:**
- `src/types/submission.ts`

**목적:**
- 프로젝트 폴더 구조 완성
- 향후 기능 구현 시 참조할 파일 구조 제공

---

## 커밋 히스토리

### Commit 1: `68e9afa`
**제목:** Refactor Menu1 page into modular components

**변경사항:**
- 6개 파일 생성 (893줄)
- Menu1 페이지 모듈화 완료

### Commit 2: `0c254a6`
**제목:** Add SelectAssignee component with unrestricted editing

**변경사항:**
- SelectAssignee.tsx 추가 (171줄)
- 상태 제한 제거

### Commit 3: `dd5c5d8`
**제목:** Refactor Menu1 page into modular components

**변경사항:**
- 21개 파일 (350줄 추가)
- Next.js → React+Vite 구조 변경
- 목업 파일 생성

---

## 최종 결과

### 파일 수
- **기존:** 1개 파일 (Menu1.tsx, 약 600줄)
- **변경 후:** 7개 실제 파일 + 21개 목업 파일

### 코드 줄 수
| 파일 | 줄 수 | 역할 |
|------|-------|------|
| `pages/Menu1.tsx` | 155줄 | 메인 페이지 (74% 감소) |
| `types/menu1.types.ts` | 42줄 | 타입 정의 |
| `utils/menu1.utils.ts` | 169줄 | 유틸리티 + 상수 |
| `hooks/useMenu1State.ts` | 160줄 | UI 상태 관리 |
| `hooks/useMenu1Data.ts` | 117줄 | 서버 데이터 |
| `components/menu1/RequestTable.tsx` | 250줄 | 테이블 컴포넌트 |
| `components/menu1/SelectAssignee.tsx` | 171줄 | 담당자 선택 |
| **총합** | **1,064줄** | 원본 대비 약 77% 증가 (구조화로 인한 증가) |

### 개선 사항
1. ✅ **가독성 향상** - 각 파일이 명확한 단일 책임
2. ✅ **유지보수성 향상** - 버그 수정 시 해당 파일만 수정
3. ✅ **재사용성 향상** - hooks와 utils는 다른 페이지에서도 사용 가능
4. ✅ **테스트 용이성** - 각 모듈을 독립적으로 테스트 가능
5. ✅ **코드 분리** - UI 상태 vs 서버 데이터 명확히 구분
6. ✅ **프로젝트 구조 일관성** - React+Vite 구조로 통일

---

## 브랜치 정보
- **브랜치명:** `claude/data-table-loading-states-0uNWq`
- **기준 브랜치:** `main` (또는 기본 브랜치)
- **PR 링크:** https://github.com/woobin-the-creator/jf-clone/pull/new/claude/data-table-loading-states-0uNWq
