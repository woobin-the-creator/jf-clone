// components/menu1/DetailedInfoModal/useTimeline.ts
import { useMemo } from "react";
import { getTimelineData, getTimelineProgress } from "./Timeline.utils";
import type { RequestSubmission } from "@/types/submission";
import type { TimelineRow, TimelineProgress } from "./Timeline.types";

interface UseTimelineReturn {
  timelineData: TimelineRow[];
  progress: TimelineProgress;
}

/**
 * 타임라인 데이터와 진행 상태를 관리하는 Hook
 */
export const useTimeline = (
  submission: RequestSubmission | null
): UseTimelineReturn => {
  const timelineData = useMemo(() => {
    if (!submission) return [];
    return getTimelineData(submission);
  }, [submission]);

  const progress = useMemo(() => {
    return getTimelineProgress(timelineData);
  }, [timelineData]);

  return {
    timelineData,
    progress,
  };
};
