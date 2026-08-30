import { useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { RequestSubmissionResponse, Calendar } from "@/types/menu1.types";
import { REFRESH_INTERVAL } from "@/utils/menu1.utils";

export const useMenu1Data = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ==================== AUTO REFRESH ====================

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isRefreshing = useRef(false);

  const refreshApprovalStatus = async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      const response = await fetch("/api/refresh-approval-status", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (data.updated_count > 0) {
          await queryClient.invalidateQueries({ queryKey: ["/api/request-submissions"] });
        }
      }
    } catch (error) {
      console.error("Failed to refresh approval status:", error);
    } finally {
      isRefreshing.current = false;
    }
  };

  useEffect(() => {
    refreshApprovalStatus();

    intervalRef.current = setInterval(() => {
      refreshApprovalStatus();
    }, REFRESH_INTERVAL);

    const handleFocus = () => refreshApprovalStatus();
    window.addEventListener("focus", handleFocus);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // ==================== DATA FETCHING ====================

  const { data: submissionsData, isLoading } = useQuery<RequestSubmissionResponse>({
    queryKey: ["/api/request-submissions"],
    queryFn: async () => {
      const response = await fetch("/api/request-submissions?page=1&page_size=100", { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch submissions");
      return response.json();
    },
  });

  const { data: empInfoData = [] } = useQuery<Calendar[]>({
    queryKey: ["/api/employees"],
  });

  // ==================== MUTATIONS ====================

  const updateAssigneeMutation = useMutation({
    mutationFn: async ({ id, assignee, comment }: { id: number; assignee: string; comment?: string }) => {
      const payload: { assignee: string; comment?: string } = { assignee };
      if (comment) payload.comment = comment;
      const response = await apiRequest("PATCH", `/api/request-submissions/${id}`, payload);

      // 응답이 ok가 아니면 에러 throw
      if (!response.ok) {
        const errorData = await response.json();
        throw { status: response.status, data: errorData };
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/request-submissions"] });
    },
    onError: (error: any) => {
      // 401 에러 처리
      if (error.status === 401) {
        toast({
          title: "세션 만료",
          description: error.data?.["401_UNAUTHORIZED"] || "세션이 만료되었습니다. 새로고침 후 재진행해주세요.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "담당자 배정 실패",
          description: error.data?.error || "담당자 배정 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
  });

  return {
    // Data
    submissionsData,
    empInfoData,
    isLoading,

    // Mutations
    updateAssigneeMutation,
  };
};
