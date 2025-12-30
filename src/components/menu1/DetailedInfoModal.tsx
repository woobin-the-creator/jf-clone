import { useEffect } from "react";
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

  // 액션 훅 (mutations, 코멘트 모달 등)
  const actions = useSubmissionActions({
    submission,
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
          submission={submission}
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
          isDeleting={actions.isDeleting}
        />

        {/* 메인 콘텐츠 영역 */}
        <MainContent submission={submission} onClose={onClose} />
      </div>

      {/* 코멘트 모달 */}
      <CommentModal {...actions.commentModalProps} />
    </div>
  );
}
