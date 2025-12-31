// components/menu1/DetailedInfoModal/timeline.utils.ts
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import type { RequestSubmission } from "@/types/submission";
import type { TimelineRow, TimelineProgress } from "./Timeline.types";

export const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "MM.dd HH:mm", { locale: ko });
  } catch {
    return "-";
  }
};

export const getTimelineData = (submission: RequestSubmission): TimelineRow[] => {
  const status = submission.status;
  const statusKnox = Number(submission.status_knox);
  const hasAssignee = !!submission.assignee;

  const baseRows: TimelineRow[] = [
    {
      order: 0,
      category: "의뢰 상신",
      status: "상신",
      statusType: "completed",
      assignee: submission.submitted_by || "-",
      datetime: formatDateTime(submission.submitted_at),
      content: "",
    },
    {
      order: 1,
      category: "모듈팀 내부결재",
      status: "-",
      statusType: "none",
      assignee: submission.assignee_internal || "-",
      datetime: "-",
      content: "",
    },
    {
      order: 2,
      category: "JOB 검토,배정",
      status: "-",
      statusType: "none",
      assignee: "-",
      datetime: "-",
      content: "",
    },
    {
      order: 3,
      category: "JOB 수정",
      status: "-",
      statusType: "none",
      assignee: "-",
      datetime: "-",
      content: "",
    },
  ];

  // 🆕 #1-1. 상신취소
  if (status === "상신취소") {
    // 디버깅: comment_cancel 값 확인
    console.log("🔍 상신취소 디버깅:", {
      id: submission.id,
      comment_cancel: submission.comment_cancel,
      comment_cancel_type: typeof submission.comment_cancel,
      comment_cancel_length: submission.comment_cancel?.length,
      full_submission: submission,
    });

    baseRows[0] = {
      ...baseRows[0],
      status: "상신 취소",
      statusType: "canceled",
      assignee: submission.submitted_by || "-",
      datetime: formatDateTime(submission.canceled_at || submission.updated_at),
      content: submission.comment_cancel || "",
    };
    // 나머지 단계들은 none 상태로 유지 (비활성화)
    return baseRows;
  }

  // #1-2. 내부결재대기중
  if (status === "내부결재대기중") {
    baseRows[1] = { ...baseRows[1], status: "대기중", statusType: "waiting" };
    return baseRows;
  }

  // #2-1. JOB 검토,배정 대기
  if (status === "JOB 검토,배정 대기") {
    baseRows[1] = {
      ...baseRows[1],
      status: "완결",
      statusType: "completed",
      datetime: formatDateTime(submission.internal_approved_at),
      content: "(상세 코멘트는 Knox 결재 참고)",
    };
    baseRows[2] = { ...baseRows[2], status: "대기중", statusType: "waiting" };
    return baseRows;
  }

  // #2-2. status_knox=3 && 반려
  if (statusKnox === 3 && status === "반려") {
    baseRows[1] = {
      ...baseRows[1],
      status: "반려",
      statusType: "rejected",
      datetime: formatDateTime(submission.internal_approved_at),
      content: "(상세 코멘트는 Knox 결재 참고)",
    };
    return baseRows;
  }

  // #3-1. JOB 수정 대기
  if (status === "JOB 수정 대기") {
    baseRows[1] = {
      ...baseRows[1],
      status: "완결",
      statusType: "completed",
      datetime: formatDateTime(submission.internal_approved_at),
      content: "(상세 코멘트는 Knox 결재 참고)",
    };
    baseRows[2] = {
      ...baseRows[2],
      status: "완결",
      statusType: "completed",
      assignee: submission.assigned_by || "-",  // 수정: assigned_by 표시
      datetime: formatDateTime(submission.assigned_at),
      content: submission.comment_assign || "",
    };
    baseRows[3] = { ...baseRows[3], status: "대기", statusType: "waiting" };
    return baseRows;
  }

  // #3-2. status_knox가 2/5/6 && assignee가 Null && status가 반려
  if ([2, 5, 6].includes(statusKnox) && !hasAssignee && status === "반려") {
    baseRows[1] = {
      ...baseRows[1],
      status: "완결",
      statusType: "completed",
      datetime: formatDateTime(submission.internal_approved_at),
      content: "(상세 코멘트는 Knox 결재 참고)",
    };
    baseRows[2] = {
      ...baseRows[2],
      status: "반려",
      statusType: "rejected",
      assignee: submission.rejected_by || "-",  // 수정: rejected_by 표시
      content: submission.comment_reject || "",
    };
    return baseRows;
  }

  // #4-1. 작성 완료
  if (status === "작성완료" || status === "완료") {
    baseRows[1] = {
      ...baseRows[1],
      status: "완결",
      statusType: "completed",
      datetime: formatDateTime(submission.internal_approved_at),
      content: "(상세 코멘트는 Knox 결재 참고)",
    };
    baseRows[2] = {
      ...baseRows[2],
      status: "완결",
      statusType: "completed",
      assignee: submission.assigned_by || "-",  // 수정: assigned_by 표시
      datetime: formatDateTime(submission.assigned_at),
      content: submission.comment_assign || "",
    };
    baseRows[3] = {
      ...baseRows[3],
      status: "완결",
      statusType: "completed",
      assignee: submission.approved_by || "-",  // 수정: approved_by 표시
      datetime: formatDateTime(submission.approved_at),
      content: submission.comment_approve || "",
    };
    return baseRows;
  }

  // #4-2. assignee 존재 && 반려
  if (hasAssignee && status === "반려") {
    baseRows[1] = {
      ...baseRows[1],
      status: "완결",
      statusType: "completed",
      datetime: formatDateTime(submission.internal_approved_at),
      content: "(상세 코멘트는 Knox 결재 참고)",
    };
    baseRows[2] = {
      ...baseRows[2],
      status: "완결",
      statusType: "completed",
      assignee: submission.assigned_by || "-",  // 수정: assigned_by 표시
      datetime: formatDateTime(submission.assigned_at),
      content: submission.comment_assign || "",
    };
    baseRows[3] = {
      ...baseRows[3],
      status: "반려",
      statusType: "rejected",
      assignee: submission.rejected_by || "-",  // 수정: rejected_by 표시
      datetime: formatDateTime(submission.rejected_at),
      content: submission.comment_reject || "",
    };
    return baseRows;
  }

  return baseRows;
};

/**
 * 타임라인 진행 상태 계산
 */
export const getTimelineProgress = (rows: TimelineRow[]): TimelineProgress => {
  const totalSteps = rows.length;
  const completedSteps = rows.filter((row) => row.statusType === "completed").length;
  const currentStep = rows.find((row) => row.statusType === "waiting");
  const isRejected = rows.some((row) => row.statusType === "rejected");
  const isCanceled = rows.some((row) => row.statusType === "canceled");

  return {
    percentage: Math.round((completedSteps / totalSteps) * 100),
    completedSteps,
    totalSteps,
    currentStepName: currentStep?.category || (isRejected ? "반려됨" : isCanceled ? "상신 취소됨" : "완료"),
    currentStepStatus: currentStep ? "진행중" : isRejected ? "반려" : isCanceled ? "상신 취소" : "완료",
    isRejected,
    isCanceled,
  };
};
