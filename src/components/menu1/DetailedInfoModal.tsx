import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import CommentModal from "@/components/menu1/CommentModal";
import type { RequestSubmission } from "@/types/submission";
import { useSubmissionActions } from "./DetailedInfoModal/hooks/useSubmissionActions";
import { useModalResize } from "./DetailedInfoModal/hooks/useModalResize";
import { Sidebar } from "./DetailedInfoModal/Sidebar";
import { MainContent } from "./DetailedInfoModal/MainContent";

interface DetailedInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: RequestSubmission | null;
  onSubmissionUpdate?: (submission: RequestSubmission) => void;
}

export default function DetailedInfoModal({
  isOpen,
  onClose,
  submission,
  onSubmissionUpdate,
}: DetailedInfoModalProps) {
  // 리사이즈 훅
  const resize = useModalResize();

  // 상세 데이터 fetch (content, comment 등 전체 필드 포함)
  const { data: fullSubmission, isLoading: isLoadingDetail } = useQuery<RequestSubmission>({
    queryKey: [`/api/request-submissions/${submission?.id}`],
    queryFn: async () => {
      if (!submission?.id) throw new Error('No submission ID');
      const response = await fetch(`/api/request-submissions/${submission.id}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch submission detail');
      return response.json();
    },
    enabled: isOpen && !!submission?.id,
    staleTime: 0, // 항상 최신 데이터 가져오기
  });

  // 액션 훅 (mutations, 코멘트 모달 등)
  // fullSubmission이 있으면 사용, 없으면 submission 사용 (로딩 중)
  const actions = useSubmissionActions({
    submission: fullSubmission || submission,
    onClose,
    onSubmissionUpdate,
  });

  // 모달 재오픈 시 상태 초기화
  useEffect(() => {
    if (isOpen) {
      resize.resetSize();
      actions.resetModalState();
    }
  }, [isOpen]);

  if (!isOpen || !submission) return null;

  // 로딩 중이거나 데이터가 없으면 submission 사용 (기본 정보 표시)
  const displaySubmission = fullSubmission || submission;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        ref={resize.modalRef}
        className="bg-gray-50 rounded-2xl shadow-2xl relative transition-all duration-300 ease-out overflow-hidden"
        style={{
          width: `${resize.modalSize.width}px`,
          height: `${resize.modalSize.height}px`,
          maxWidth: "95vw",
          maxHeight: "90vh",
          cursor: resize.cursorStyle,
          boxSizing: "border-box",
          display: "flex",
          userSelect: "text",
        }}
        onMouseDown={resize.handleBorderMouseDown}
        onMouseMove={resize.handleMouseMove}
        onMouseLeave={resize.handleMouseLeave}
      >
        {/* 좌측 사이드바 */}
        <Sidebar
          submission={displaySubmission}
          user={actions.user}
          isManager={actions.isManager}
          maxTatInput={actions.maxTatInput}
          setMaxTatInput={actions.setMaxTatInput}
          isEditingTat={actions.isEditingTat}
          setIsEditingTat={actions.setIsEditingTat}
          handleMaxTatSave={actions.handleMaxTatSave}
          handleMaxTatCancel={actions.handleMaxTatCancel}
          isMaxTatSaving={actions.isMaxTatSaving}
          handleApproveClick={actions.handleApproveClick}
          handleRejectClick={actions.handleRejectClick}
          handleCancelClick={actions.handleCancelClick}
          handleDeleteConfirm={actions.handleDeleteConfirm}
          isApproving={actions.isApproving}
          isRejecting={actions.isRejecting}
          isCanceling={actions.isCanceling}
          isDeleting={actions.isDeleting}
        />

        {/* 메인 콘텐츠 영역 */}
        <MainContent submission={displaySubmission} onClose={onClose} isLoadingDetail={isLoadingDetail} />
      </div>

      {/* 코멘트 모달 */}
      <CommentModal {...actions.commentModalProps} />
    </div>
  );
}
