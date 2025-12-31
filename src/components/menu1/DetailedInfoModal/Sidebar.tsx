import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Hash,
  Layers,
  Target,
  Building2,
  CheckCircle,
  XCircle,
  Pencil,
  Save,
  X,
  Trash2,
  Ban,
} from "lucide-react";
import type { RequestSubmission } from "@/types/submission";

// 상태별 스타일
const getStatusConfig = (status?: string) => {
  switch (status) {
    case "완료":
    case "작성완료":
      return {
        color: "text-green-700",
        bg: "bg-green-50",
        border: "border-green-200",
        dot: "bg-green-500",
        text: "작성완료",
      };
    case "진행중":
      return {
        color: "text-blue-700",
        bg: "bg-blue-50",
        border: "border-blue-200",
        dot: "bg-blue-500",
        text: "진행중",
      };
    case "JOB 수정 대기":
      return {
        color: "text-indigo-700",
        bg: "bg-indigo-50",
        border: "border-indigo-200",
        dot: "bg-indigo-500",
        text: "담당자 확인 대기중",
      };
    case "반려":
      return {
        color: "text-red-700",
        bg: "bg-red-50",
        border: "border-red-200",
        dot: "bg-red-500",
        text: "반려",
      };
    case "상신취소":
      return {
        color: "text-gray-700",
        bg: "bg-gray-50",
        border: "border-gray-200",
        dot: "bg-gray-500",
        text: "상신취소",
      };
    case "대기중":
    default:
      return {
        color: "text-amber-700",
        bg: "bg-amber-50",
        border: "border-amber-200",
        dot: "bg-amber-500",
        text: status || "대기중",
      };
  }
};

interface SidebarProps {
  submission: RequestSubmission;
  user: any;
  isManager: boolean;
  // TAT 관련
  maxTatInput: string;
  setMaxTatInput: (value: string) => void;
  isEditingTat: boolean;
  setIsEditingTat: (value: boolean) => void;
  handleMaxTatSave: () => void;
  handleMaxTatCancel: () => void;
  isMaxTatSaving: boolean;
  // 액션 핸들러
  handleApproveClick: (id: number) => void;
  handleRejectClick: (id: number) => void;
  handleCancelClick: (id: number) => void;
  handleDeleteConfirm: () => void;
  // 로딩 상태
  isApproving: boolean;
  isRejecting: boolean;
  isCanceling: boolean;
  isDeleting: boolean;
}

export function Sidebar({
  submission,
  user,
  isManager,
  maxTatInput,
  setMaxTatInput,
  isEditingTat,
  setIsEditingTat,
  handleMaxTatSave,
  handleMaxTatCancel,
  isMaxTatSaving,
  handleApproveClick,
  handleRejectClick,
  handleCancelClick,
  handleDeleteConfirm,
  isApproving,
  isRejecting,
  isCanceling,
  isDeleting,
}: SidebarProps) {
  const statusConfig = getStatusConfig(submission.status);
  const knox_id_from_session =
    user?.mail_knox?.split?.("@")?.[0]?.trim() ?? user?.username ?? "";

  return (
    <div className="sidebar w-50 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* 사이드바 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${statusConfig.dot} ${
                submission.status === "JOB 수정 대기" ? "animate-pulse" : ""
              }`}
            />
            <span className={`text-[15px] font-semibold ${statusConfig.color}`}>
              {statusConfig.text}
            </span>
          </div>
          <span className="text-[15px] text-gray-400">#{submission.id}</span>
        </div>
      </div>

      {/* 사이드바 정보 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-5">
          {/* 기본 정보 섹션 */}
          <div>
            <h4 className="text-[15px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              기본 정보
            </h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <Hash className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-gray-500">Line ID</p>
                  <p className="text-[17px] font-medium text-gray-900 truncate">
                    {submission.line_id || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Layers className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-gray-500">PPID</p>
                  <p className="text-[17px] font-medium text-gray-900 truncate">
                    {submission.ppid || "-"}
                  </p>
                </div>
              </div>

              {/* TAT */}
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-gray-500">TAT</p>

                  {!isEditingTat && (
                    <div className="flex items-center gap-1">
                      <p className="text-[17px] font-medium text-gray-900 truncate">
                        {maxTatInput?.trim() !== "" ? `${maxTatInput}일` : "-"}
                      </p>
                      {isManager && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-gray-500 hover:text-gray-700"
                          onClick={() => setIsEditingTat(true)}
                          title="TAT 수정"
                          aria-label="TAT 수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  )}

                  {isEditingTat && isManager && (
                    <div className="flex items-center gap-1">
                      <Input
                        value={maxTatInput}
                        onChange={(e) => {
                          const onlyDigits = e.target.value.replace(/[^\d]/g, "");
                          setMaxTatInput(onlyDigits);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleMaxTatSave();
                          } else if (e.key === "Escape") {
                            handleMaxTatCancel();
                          }
                        }}
                        className="h-7 w-14 text-[15px]"
                        placeholder="일"
                        inputMode="numeric"
                        pattern="\d*"
                        autoFocus
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleMaxTatSave}
                        className="h-6 w-6"
                        disabled={isMaxTatSaving}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleMaxTatCancel}
                        className="h-6 w-6"
                        disabled={isMaxTatSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* 부서 */}
              <div className="flex items-start gap-2">
                <Building2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] text-gray-500">부서</p>
                  <p className="text-[17px] font-medium text-gray-900 truncate">
                    {submission.department || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 변경의뢰 항목 섹션 */}
          {submission.change_request_items && (
            <div>
              <h4 className="text-[15px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                변경의뢰 항목
              </h4>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
                <p className="text-[15px] text-gray-700 whitespace-pre-wrap break-words">
                  {submission.change_request_items}
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 사이드바 푸터 - 액션 버튼 */}
      <div className="p-3 border-t border-gray-100 space-y-2">
        {/* 결재/반려 버튼 - JOB 수정 대기 */}
        {user &&
          submission.assignee
            ?.split(",")
            .map((id) => id.trim())
            .includes(knox_id_from_session) &&
          submission.status === "JOB 수정 대기" && (
            <div className="space-y-1.5">
              <Button
                variant="default"
                size="sm"
                onClick={() => handleApproveClick(submission.id)}
                disabled={isApproving || isRejecting}
                className="w-full gap-1.5 bg-blue-600 hover:bg-blue-700 text-[13px] h-8"
              >
                <CheckCircle className="h-4 w-4" />
                {isApproving ? "처리중..." : "결재 승인"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRejectClick(submission.id)}
                disabled={isApproving || isRejecting}
                className="w-full gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300 text-[13px] h-8"
              >
                <XCircle className="h-4 w-4" />
                {isRejecting ? "처리중..." : "의뢰 반려"}
              </Button>
            </div>
          )}

        {/* 반려 버튼 - JOB 검토,배정 대기 상태 (MANAGER 전용) */}
        {isManager && submission.status === "JOB 검토,배정 대기" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRejectClick(submission.id)}
            disabled={isRejecting}
            className="w-full gap-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-300 text-[13px] h-8"
          >
            <XCircle className="h-4 w-4" />
            {isRejecting ? "처리중..." : "의뢰 반려"}
          </Button>
        )}

        {/* 상신 취소(Knox) 버튼 */}
        {user &&
          submission.submitted_by === user.username &&
          submission.status === "내부결재대기중" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelClick(submission.id)}
              disabled={isCanceling}
              className="w-full gap-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-300 text-[13px] h-8"
            >
              <Ban className="h-4 w-4" />
              {isCanceling ? "취소중..." : "상신 취소"}
            </Button>
          )}

        {/* 삭제 버튼 */}
        {user &&
          submission.submitted_by === user.username &&
          submission.status !== "작성완료" &&
          submission.status !== "반려" &&
          submission.status !== "내부결재대기중" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full gap-1.5 text-[13px] h-8"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? "삭제중..." : "의뢰 삭제"}
            </Button>
          )}

        {/* 상태 표시 */}
        {submission.status === "작성완료" && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-2">
            <p className="text-[13px] text-green-700 text-center font-medium">✓ 결재 완료</p>
          </div>
        )}
        {submission.status === "반려" && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2">
            <p className="text-[13px] text-red-700 text-center font-medium">✗ 반려됨</p>
          </div>
        )}
        {submission.status === "상신취소" && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
            <p className="text-[13px] text-gray-700 text-center font-medium">⊘ 상신 취소됨</p>
          </div>
        )}
      </div>
    </div>
  );
}
