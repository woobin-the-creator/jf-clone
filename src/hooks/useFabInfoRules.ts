import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Fab_Info_Rule,
  Fab_Info_Data,
  Fab_Info_Response,
  Create_Rule_Payload,
  Update_Rule_Payload,
  Fab_Info_Filters,
} from "@/types/fabInfo.types";

// Re-export types for convenience
export type {
  Fab_Info_Rule,
  Fab_Info_Data,
  Fab_Info_Response,
  Create_Rule_Payload,
  Update_Rule_Payload,
  Fab_Info_Filters,
};

// ============================================================================
// Hook
// ============================================================================

export function useFabInfoRules() {
  const queryClient = useQueryClient();

  // 규칙 목록 조회
  const {
    data: rules = [],
    isLoading: isLoadingRules,
    refetch: refetchRules,
  } = useQuery<Fab_Info_Rule[]>({
    queryKey: ["/api/fab-info-rules"],
  });

  // 중복 제거된 ees_line_id 목록 조회
  const {
    data: eesLineIdsData,
    isLoading: isLoadingEesLineIds,
  } = useQuery<{ ees_line_ids: string[] }>({
    queryKey: ["/api/fab-info/ees-line-ids"],
  });

  const eesLineIds = eesLineIdsData?.ees_line_ids || [];

  // 규칙이 없는 ees_line_id만 필터링 (드롭다운용)
  const availableEesLineIds = eesLineIds.filter(
    (id) => !rules.some((rule) => rule.target_value === id)
  );

  // 규칙 생성
  const createRuleMutation = useMutation({
    mutationFn: async (payload: Create_Rule_Payload) => {
      const response = await fetch("/api/fab-info-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.new_value?.[0] || "규칙 생성 실패");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fab-info-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fab-info-filtered"] });
    },
  });

  // 규칙 수정
  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Update_Rule_Payload) => {
      const response = await fetch(`/api/fab-info-rules/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.new_value?.[0] || "규칙 수정 실패");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fab-info-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fab-info-filtered"] });
    },
  });

  // 규칙 삭제
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      const response = await fetch(`/api/fab-info-rules/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "규칙 삭제 실패");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fab-info-rules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/fab-info-filtered"] });
    },
  });

  return {
    // Data
    rules,
    eesLineIds,
    availableEesLineIds,

    // Loading states
    isLoadingRules,
    isLoadingEesLineIds,

    // Mutations
    createRule: createRuleMutation.mutate,
    createRuleAsync: createRuleMutation.mutateAsync,
    isCreatingRule: createRuleMutation.isPending,

    updateRule: updateRuleMutation.mutate,
    updateRuleAsync: updateRuleMutation.mutateAsync,
    isUpdatingRule: updateRuleMutation.isPending,

    deleteRule: deleteRuleMutation.mutate,
    deleteRuleAsync: deleteRuleMutation.mutateAsync,
    isDeletingRule: deleteRuleMutation.isPending,

    // Refetch
    refetchRules,
  };
}

// ============================================================================
// Fab Info Data Hook
// ============================================================================

export function useFabInfoData(
  type: "original" | "filtered",
  page: number = 1,
  pageSize: number = 100,
  filters: Fab_Info_Filters = {}
) {
  const endpoint = type === "original" ? "/api/fab-info" : "/api/fab-info-filtered";

  // 필터 쿼리 파라미터 구성
  const queryParams = new URLSearchParams();
  queryParams.set("page", page.toString());
  queryParams.set("page_size", pageSize.toString());

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      queryParams.set(key, value);
    }
  });

  const queryKey = [endpoint, page, pageSize, filters];

  const { data, isLoading, refetch } = useQuery<Fab_Info_Response>({
    queryKey,
    queryFn: async () => {
      const response = await fetch(`${endpoint}?${queryParams.toString()}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("데이터 조회 실패");
      }
      return response.json();
    },
  });

  return {
    data: data?.results || [],
    totalCount: data?.total_count || 0,
    totalPages: data?.total_pages || 0,
    currentPage: data?.page || 1,
    isLoading,
    refetch,
  };
}
