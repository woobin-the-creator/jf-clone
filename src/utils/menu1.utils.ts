import { format, parseISO, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import type { RequestSubmission, FilterState, Calendar } from "@/types/menu1.types";

// ==================== CONSTANTS ====================

export const FIXED_WIDTHS = {
  lineId: "w-[70px]",
  ppid: "w-[80px]",
  maxTat: "w-[60px]",
  submittedBy: "w-[80px]",
  submittedAt: "w-[100px]",
  status: "w-[120px]",
} as const;

export const ITEMS_PER_PAGE = 15;
export const REFRESH_INTERVAL = 30000; // 30 seconds

// ==================== UTILITY FUNCTIONS ====================

/**
 * URL 쿼리 파라미터를 Date 객체로 변환
 */
export const parseDateParam = (value: string | null): Date | undefined => {
  if (!value) return undefined;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};

/**
 * 두 Date 객체가 같은지 비교
 */
export const isSameDate = (a?: Date, b?: Date): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.getTime() === b.getTime();
};

/**
 * 날짜를 yyyy-MM-dd 형식으로 포맷팅
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, "yyyy-MM-dd", { locale: ko });
};

/**
 * 컬럼별 고유 값 추출
 */
export const getUniqueValues = (
  data: RequestSubmission[] | undefined,
  column: keyof RequestSubmission
): string[] => {
  if (!data) return [];
  const values = data
    .map((item) => item[column])
    .filter((value) => value != null && value !== "")
    .map((value) => String(value));
  return Array.from(new Set(values)).sort();
};

/**
 * 모든 담당자 knox_id 개별 추출 (중복 제거)
 * 예: ["12345,67890", "12345", "99999"] → ["12345", "67890", "99999"]
 */
export const getUniqueAssignees = (
  data: RequestSubmission[] | undefined
): string[] => {
  if (!data) return [];

  const allAssignees = data
    .map(item => item.assignee)
    .filter(Boolean)
    .flatMap(assigneeStr =>
      assigneeStr!.split(',').map(id => id.trim())
    )
    .filter(Boolean);

  return Array.from(new Set(allAssignees)).sort();
};

/**
 * knox_id 배열을 이름 배열로 변환
 */
export const getUniqueAssigneeNames = (
  data: RequestSubmission[] | undefined,
  empInfoData: Calendar[]
): string[] => {
  const knoxIds = getUniqueAssignees(data);

  const employeeMap = new Map<string, Calendar>();
  empInfoData.forEach(emp => {
    employeeMap.set(String(emp.knox_id), emp);
  });

  return knoxIds
    .map(id => employeeMap.get(id)?.name || id)
    .filter(Boolean)
    .sort();
};

/**
 * 필터 조건에 따라 데이터 필터링
 */
export const filterData = (
  data: RequestSubmission[],
  filters: FilterState,
  empInfoData?: Calendar[]
): RequestSubmission[] => {
  let filtered = data;

  // 검색어 필터
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();

    // knox_id → 이름 매핑 생성
    const employeeMap = new Map<string, Calendar>();
    if (empInfoData) {
      empInfoData.forEach(emp => {
        employeeMap.set(String(emp.knox_id), emp);
      });
    }

    filtered = filtered.filter((item) => {
      // 기본 필드 검색 (모든 필드)
      const basicMatch = Object.values(item).some((value) =>
        String(value).toLowerCase().includes(searchLower)
      );

      // 담당자 이름 검색 (knox_id → 이름 변환)
      const assigneeMatch = item.assignee && empInfoData
        ? item.assignee.split(',')
            .map(id => employeeMap.get(id.trim())?.name || '')
            .some(name => name.toLowerCase().includes(searchLower))
        : false;

      return basicMatch || assigneeMatch;
    });
  }

  // 날짜 필터
  if (filters.dateFilter.from || filters.dateFilter.to) {
    filtered = filtered.filter((item) => {
      const itemDate = new Date(item.submitted_at);
      const fromMatch = !filters.dateFilter.from || itemDate >= filters.dateFilter.from;
      const toMatch = !filters.dateFilter.to || itemDate <= filters.dateFilter.to;
      return fromMatch && toMatch;
    });
  }

  // 컬럼 필터 (값 필터링)
  filters.columnFilters.forEach((filter) => {
    if (filter.values.length > 0) {
      filtered = filtered.filter((item) => {
        // 담당자 컬럼: 배열에 포함 여부 체크
        if (filter.column === 'assignee') {
          const assignees = item.assignee?.split(',').map(id => id.trim()) || [];
          // 선택한 knox_id 중 하나라도 담당자에 포함되면 true
          return filter.values.some(selectedId => assignees.includes(selectedId));
        }

        // 다른 컬럼: 기존 로직
        const value = String(item[filter.column as keyof RequestSubmission] || "");
        return filter.values.includes(value);
      });
    }
  });

  // 컬럼 필터 (정렬)
  filters.columnFilters.forEach((filter) => {
    if (filter.sortOrder) {
      filtered.sort((a, b) => {
        const aValue = String(a[filter.column as keyof RequestSubmission] || "");
        const bValue = String(b[filter.column as keyof RequestSubmission] || "");
        const comparison = aValue.localeCompare(bValue);
        return filter.sortOrder === "asc" ? comparison : -comparison;
      });
    }
  });

  return filtered;
};

/**
 * CSV 파일 다운로드 (백엔드 API 호출)
 * DB 전체 데이터를 CSV로 내보내기
 */
export const downloadCSV = async (): Promise<void> => {
  try {
    const response = await fetch("/api/request-submissions/export-csv", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("CSV 다운로드에 실패했습니다.");
    }

    // Blob으로 변환 후 다운로드
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `request_submissions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("CSV 다운로드 오류:", error);
    throw error;
  }
};

/**
 * 담당자 컬럼의 최대 너비 계산
 */
export const calculateMaxAssigneeWidth = (
  data: RequestSubmission[],
  empInfoData: any[]
): number => {
  if (!data.length || !empInfoData.length) return 80;
  let maxCount = 0;

  data.forEach((submission) => {
    if (submission.assignee) {
      const ids = submission.assignee.split(",").map((id) => id.trim()).filter(Boolean);
      maxCount = Math.max(maxCount, ids.length);
    }
  });

  if (maxCount === 0) return 80;
  return Math.max(80, Math.min(300, maxCount * 50 + 24));
};
