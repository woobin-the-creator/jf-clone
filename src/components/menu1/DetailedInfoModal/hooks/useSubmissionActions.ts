import { useState, useMemo, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { CommentModalMode } from "@/components/menu1/CommentModal";
import type { RequestSubmission } from "@/types/submission";

interface UseSubmissionActionsProps {
  submission: RequestSubmission | null;
  onClose: () => void;
  onSubmissionUpdate?: (submission: RequestSubmission) => void;
}

export function useSubmissionActions({
  submission,
  onClose,
  onSubmissionUpdate,
}: UseSubmissionActionsProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // TAT 인라인 편집 상태
  const [maxTatInput, setMaxTatInput] = useState<string>("");
  const [isEditingTat, setIsEditingTat] = useState<boolean>(false);

  // 코멘트 모달 상태 관리
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentMode, setCommentMode] = useState<CommentModalMode>("approve");
  const [rejectComment, setRejectComment] = useState("");
  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);
  const [approveComment, setApproveComment] = useState("");
  const [pendingApproveId, setPendingApproveId] = useState<number | null>(null);
  const [cancelComment, setCancelComment] = useState("");
  const [pendingCancelId, setPendingCancelId] = useState<number | null>(null);

  // 제출건 바뀔 때 TAT 초기화
  useEffect(() => {
    if (submission) {
      setMaxTatInput(submission.Max_TAT != null ? String(submission.Max_TAT) : "");
    } else {
      setMaxTatInput("");
    }
  }, [submission?.id, submission?.Max_TAT]);

  const parsedMaxTat = useMemo(() => {
    const trimmed = maxTatInput.trim();
    if (trimmed === "") return null;
    if (!/^\d+$/.test(trimmed)) return NaN;
    return Number(trimmed);
  }, [maxTatInput]);

  const isMaxTatValid =
    parsedMaxTat === null || (!Number.isNaN(parsedMaxTat) && parsedMaxTat >= 0);

  // 삭제 mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: number; comment?: string }) => {
      const payload: { comment?: string } = {};
      if (comment) {
        payload.comment = comment;
      }
      return await apiRequest("DELETE", `/api/request-submissions/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/request-submissions"] });
      onClose();
      toast({ title: "삭제 완료", description: "의뢰가 성공적으로 삭제되었습니다." });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({
          title: "세션 만료",
          description: error.data?.["401_UNAUTHORIZED"] || "세션이 만료되었습니다. 새로고침 후 재진행해주세요.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "삭제 실패",
          description: error.data?.error || error.message || "의뢰 삭제 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
  });

  // Max TAT 갱신 mutation
  const updateMaxTatMutation = useMutation({
    mutationFn: async ({ id, maxTat }: { id: number; maxTat: number | null }) => {
      const response = await apiRequest("PATCH", `/api/request-submissions/${id}`, {
        Max_TAT: maxTat,
      });
      return await response.json();
    },
    onSuccess: (updated: RequestSubmission) => {
      queryClient.invalidateQueries({ queryKey: ["/api/request-submissions"] });
      setMaxTatInput(updated.Max_TAT != null ? String(updated.Max_TAT) : "");
      onSubmissionUpdate?.(updated);
      setIsEditingTat(false);
      toast({ title: "Max TAT가 업데이트되었습니다.", description: "변경 사항이 저장되었습니다." });
    },
    onError: (error: any) => {
      toast({
        title: "Max TAT 업데이트 실패",
        description: error.message || "Max TAT를 업데이트하는 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    },
  });

  // 결재 mutation
  const approveSubmissionMutation = useMutation({
    mutationFn: async ({ id, comment, approved_by }: { id: number; comment?: string; approved_by?: string }) => {
      const payload: { action: string; comment?: string; approved_by?: string } = { action: "approve" };
      if (comment) {
        payload.comment = comment;
      }
      if (approved_by) {
        payload.approved_by = approved_by;
      }
      return await apiRequest("PUT", `/api/request-submissions/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/request-submissions"] });
      handleCommentModalClose();
      toast({ title: "결재 완료", description: "의뢰가 성공적으로 결재되었습니다." });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({
          title: "세션 만료",
          description: error.data?.["401_UNAUTHORIZED"] || "세션이 만료되었습니다. 새로고침 후 재진행해주세요.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "결재 실패",
          description: error.data?.error || error.message || "의뢰 결재 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
  });

  // 반려 mutation
  const rejectSubmissionMutation = useMutation({
    mutationFn: async ({ id, comment, rejected_by }: { id: number; comment?: string; rejected_by?: string }) => {
      const payload: { action: string; comment?: string; rejected_by?: string } = { action: "reject" };
      if (comment) {
        payload.comment = comment;
      }
      if (rejected_by) {
        payload.rejected_by = rejected_by;
      }
      return await apiRequest("PUT", `/api/request-submissions/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/request-submissions"] });
      handleCommentModalClose();
      toast({ title: "반려 완료", description: "의뢰가 반려 처리되었습니다." });
    },
    onError: (error: any) => {
      if (error.status === 401) {
        toast({
          title: "세션 만료",
          description: error.data?.["401_UNAUTHORIZED"] || "세션이 만료되었습니다. 새로고침 후 재진행해주세요.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "반려 실패",
          description: error.data?.error || error.message || "의뢰 반려 중 오류가 발생했습니다.",
          variant: "destructive",
        });
      }
    },
  });

  // 결재 버튼 클릭 시
  const handleApproveClick = (id: number) => {
    setPendingApproveId(id);
    setCommentMode("approve");
    setApproveComment("");
    setIsCommentModalOpen(true);
  };

  // 반려 버튼 클릭 시
  const handleRejectClick = (id: number) => {
    setPendingRejectId(id);
    setCommentMode("reject");
    setRejectComment("");
    setIsCommentModalOpen(true);
  };

  // 상신 취소 버튼 클릭 시
  const handleCancelClick = (id: number) => {
    setPendingCancelId(id);
    setCommentMode("cancel");
    setCancelComment("");
    setIsCommentModalOpen(true);
  };

  // 코멘트 모달에서 전송 버튼 클릭 시
  const handleCommentSubmit = () => {
    const currentUsername = user?.username;

    if (commentMode === "approve" && pendingApproveId) {
      approveSubmissionMutation.mutate({
        id: pendingApproveId,
        comment: approveComment.trim() || undefined,
        approved_by: currentUsername,
      });
    } else if (commentMode === "reject" && pendingRejectId) {
      rejectSubmissionMutation.mutate({
        id: pendingRejectId,
        comment: rejectComment.trim() || undefined,
        rejected_by: currentUsername,
      });
    } else if (commentMode === "cancel" && pendingCancelId) {
      deleteSubmissionMutation.mutate({
        id: pendingCancelId,
        comment: cancelComment.trim() || undefined,
      });
    }
  };

  // 코멘트 모달 닫기
  const handleCommentModalClose = () => {
    setIsCommentModalOpen(false);
    setPendingRejectId(null);
    setRejectComment("");
    setPendingApproveId(null);
    setApproveComment("");
    setPendingCancelId(null);
    setCancelComment("");
    onClose();
  };

  // Max TAT 저장
  const handleMaxTatSave = () => {
    if (!submission) return;
    if (!isMaxTatValid || Number.isNaN(parsedMaxTat ?? undefined)) {
      toast({
        title: "유효하지 않은 값",
        description: "Max TAT는 0 이상의 정수로 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    updateMaxTatMutation.mutate({ id: submission.id, maxTat: parsedMaxTat });
  };

  // TAT 편집 취소
  const handleMaxTatCancel = () => {
    setMaxTatInput(submission?.Max_TAT != null ? String(submission.Max_TAT) : "");
    setIsEditingTat(false);
  };

  // 삭제 확인
  const handleDeleteConfirm = () => {
    if (!submission) return;
    if (confirm("정말로 이 의뢰를 삭제하시겠습니까?\n삭제된 의뢰는 복구할 수 없습니다.")) {
      deleteSubmissionMutation.mutate({ id: submission.id });
    }
  };

  // 모달 상태 초기화
  const resetModalState = () => {
    setIsEditingTat(false);
    setIsCommentModalOpen(false);
    setPendingRejectId(null);
    setRejectComment("");
    setPendingApproveId(null);
    setApproveComment("");
    setPendingCancelId(null);
    setCancelComment("");
  };

  return {
    user,
    isManager: user?.auth === "MANAGER",

    // TAT 관련
    maxTatInput,
    setMaxTatInput,
    isEditingTat,
    setIsEditingTat,
    handleMaxTatSave,
    handleMaxTatCancel,
    isMaxTatSaving: updateMaxTatMutation.isPending,

    // 코멘트 모달 props
    commentModalProps: {
      isOpen: isCommentModalOpen,
      onClose: handleCommentModalClose,
      comment:
        commentMode === "approve"
          ? approveComment
          : commentMode === "reject"
          ? rejectComment
          : cancelComment,
      onCommentChange:
        commentMode === "approve"
          ? setApproveComment
          : commentMode === "reject"
          ? setRejectComment
          : setCancelComment,
      onSubmit: handleCommentSubmit,
      isPending:
        approveSubmissionMutation.isPending ||
        rejectSubmissionMutation.isPending ||
        deleteSubmissionMutation.isPending,
      mode: commentMode,
    },

    // 액션 핸들러
    handleApproveClick,
    handleRejectClick,
    handleCancelClick,
    handleDeleteConfirm,
    resetModalState,

    // 로딩 상태
    isApproving: approveSubmissionMutation.isPending,
    isRejecting: rejectSubmissionMutation.isPending,
    isDeleting: deleteSubmissionMutation.isPending,
  };
}
