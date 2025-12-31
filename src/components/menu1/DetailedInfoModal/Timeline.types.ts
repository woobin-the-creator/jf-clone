// components/menu1/DetailedInfoModal/timeline.types.ts

export interface TimelineRow {
    order: number;
    category: string;
    status: string;
    statusType: "pending" | "waiting" | "completed" | "rejected" | "canceled" | "none";
    assignee: string;
    datetime: string;
    content: string;
  }

  export interface TimelineProgress {
    percentage: number;
    completedSteps: number;
    totalSteps: number;
    currentStepName: string;
    currentStepStatus: string;
    isRejected: boolean;
    isCanceled: boolean;
  }
