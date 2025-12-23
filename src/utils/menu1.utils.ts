import { format, parseISO, isValid } from "date-fns";
import { ko } from "date-fns/locale";
import type { RequestSubmission, FilterState } from "@/types/menu1.types";

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
 * 필터 조건에 따라 데이터 필터링
 */
export const filterData = (
  data: RequestSubmission[],
  filters: FilterState
): RequestSubmission[] => {
  let filtered = data;

  // 검색어 필터
  if (filters.searchTerm) {
    const searchLower = filters.searchTerm.toLowerCase();
    filtered = filtered.filter((item) =>
      Object.values(item).some((value) => String(value).toLowerCase().includes(searchLower))
    );
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
 * CSV 파일 다운로드
 */
export const downloadCSV = (data: RequestSubmission[]): void => {
  if (!data.length) return;

  const headers = ["Line ID", "PPID", "Max TAT", "변경의뢰 항목", "제목", "상신자", "의뢰날짜", "상태", "담당자"];

  const csvContent = [
    headers.join(","),
    ...data.map((submission) =>
      [
        submission.line_id || "",
        submission.ppid || "",
        submission.Max_TAT != null ? String(submission.Max_TAT) : "",
        `"${(submission.change_request_items || "").replace(/"/g, '""')}"`,
        `"${(submission.title || "").replace(/"/g, '""')}"`,
        submission.submitted_by || "",
        formatDate(submission.submitted_at),
        submission.status || "내부결재대기중",
        submission.assignee || "",
      ].join(",")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `의뢰상신목록_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
