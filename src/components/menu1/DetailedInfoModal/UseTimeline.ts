// UseTimeline Hook
import { useState, useEffect } from "react";
import type { TimelineEvent } from "./Timeline.types";

export function useTimeline(submissionId: number) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // TODO: Fetch timeline events
    setIsLoading(true);
    // Fetch logic here
    setIsLoading(false);
  }, [submissionId]);

  return { events, isLoading };
}
