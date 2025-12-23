import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import type { FilterState } from "@/types/menu1.types";
import { parseDateParam, isSameDate } from "@/utils/menu1.utils";

export const useMenu1State = () => {
  // ==================== FILTER STATE ====================
  const [filters, setFilters] = useState<FilterState>({
    searchTerm: "",
    dateFilter: { from: undefined, to: undefined },
    columnFilters: [],
  });

  const [isFilterInitialized, setIsFilterInitialized] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearchTerm, setAppliedSearchTerm] = useState("");

  // ==================== PAGINATION STATE ====================
  const [currentPage, setCurrentPage] = useState(1);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const transitionTimerRef = useRef<number | null>(null);
  const settleTimerRef = useRef<number | null>(null);

  // ==================== FILTER EFFECTS ====================

  // URL에서 초기 필터 읽기
  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get("search") ?? "";
    const fromDate = parseDateParam(params.get("from"));
    const toDate = parseDateParam(params.get("to"));

    setFilters((prev) => {
      const sameSearch = prev.searchTerm === searchParam;
      const sameFrom = isSameDate(prev.dateFilter.from, fromDate);
      const sameTo = isSameDate(prev.dateFilter.to, toDate);
      if (sameSearch && sameFrom && sameTo) return prev;

      return {
        ...prev,
        searchTerm: searchParam,
        dateFilter: { from: fromDate, to: toDate },
      };
    });

    setAppliedSearchTerm(searchParam);
    setIsFilterInitialized(true);
  }, []);

  // searchInput을 filters.searchTerm과 동기화
  useEffect(() => {
    setSearchInput(filters.searchTerm);
  }, [filters.searchTerm]);

  // URL 업데이트
  useEffect(() => {
    if (!isFilterInitialized || typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);

    if (appliedSearchTerm) params.set("search", appliedSearchTerm);
    else params.delete("search");

    const fromValue = filters.dateFilter.from ? format(filters.dateFilter.from, "yyyy-MM-dd") : null;
    const toValue = filters.dateFilter.to ? format(filters.dateFilter.to, "yyyy-MM-dd") : null;

    if (fromValue) params.set("from", fromValue);
    else params.delete("from");

    if (toValue) params.set("to", toValue);
    else params.delete("to");

    const newSearch = params.toString();
    const currentSearch = window.location.search.replace(/^\?/, "");

    if (newSearch !== currentSearch) {
      const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
      window.history.replaceState(null, "", newUrl);
    }
  }, [appliedSearchTerm, filters.dateFilter.from, filters.dateFilter.to, isFilterInitialized]);

  // ==================== PAGINATION EFFECTS ====================

  const clearPageTimers = () => {
    if (transitionTimerRef.current) window.clearTimeout(transitionTimerRef.current);
    if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    transitionTimerRef.current = null;
    settleTimerRef.current = null;
  };

  // 클린업
  useEffect(() => {
    return () => {
      clearPageTimers();
    };
  }, []);

  // 필터 변경 시 페이지 리셋
  useEffect(() => {
    clearPageTimers();
    setIsPageTransitioning(false);
    setCurrentPage(1);
  }, [filters]);

  // ==================== HANDLERS ====================

  const applySearchTerm = () => {
    setFilters((prev) => {
      if (prev.searchTerm === searchInput) return prev;
      return { ...prev, searchTerm: searchInput };
    });
    setAppliedSearchTerm(searchInput);
  };

  const handleColumnFilter = (column: string, values: string[], sortOrder?: "asc" | "desc") => {
    setFilters((prev) => ({
      ...prev,
      columnFilters: [
        ...prev.columnFilters.filter((f) => f.column !== column),
        ...(values.length > 0 || sortOrder ? [{ column, values, sortOrder }] : []),
      ],
    }));
  };

  const requestPageChange = (nextPage: number, totalPages: number) => {
    if (typeof window === "undefined") return;
    if (isPageTransitioning) return;
    if (nextPage === currentPage) return;
    if (nextPage < 1 || nextPage > totalPages) return;

    clearPageTimers();
    setIsPageTransitioning(true);

    transitionTimerRef.current = window.setTimeout(() => {
      setCurrentPage(nextPage);

      settleTimerRef.current = window.setTimeout(() => {
        setIsPageTransitioning(false);
      }, 140);
    }, 120);
  };

  return {
    // Filter state
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    appliedSearchTerm,
    applySearchTerm,
    handleColumnFilter,

    // Pagination state
    currentPage,
    isPageTransitioning,
    requestPageChange,
  };
};
