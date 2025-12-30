import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { useTimeline } from "./UseTimeline";
import { TimelineViewer } from "./TimelineViewer";
import type { RequestSubmission } from "@/types/submission";

// 줌 상수
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;

interface MainContentProps {
  submission: RequestSubmission;
  onClose: () => void;
}

export function MainContent({ submission, onClose }: MainContentProps) {
  // 줌 상태
  const [zoomLevel, setZoomLevel] = useState(1);

  // 타임라인 접기/펼치기 - 기본 펼침 상태
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(true);

  // 메인 스크롤 영역 ref
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // 본문 가로 스크롤 영역 ref
  const contentScrollRef = useRef<HTMLDivElement>(null);

  // 타임라인 데이터 (모듈화된 Hook 사용)
  const { timelineData, progress } = useTimeline(submission);

  // 디버깅용 콘솔 로그 (개발 환경에서만)
  useEffect(() => {
    if (import.meta.env.DEV && submission) {
      console.log('=== DetailedInfoModal Submission Debug ===');
      console.log('submission.id:', submission.id);
      console.log('submission.status:', submission.status);
      console.log('submission.status_knox:', submission.status_knox);
      console.log('submission.internal_approved_at:', submission.internal_approved_at);
      console.log('submission.submitted_at:', submission.submitted_at);
      console.log('submission.assigned_at:', submission.assigned_at);
      console.log('submission.approved_at:', submission.approved_at);
      console.log('submission.rejected_at:', submission.rejected_at);
      console.log('Full submission object:', submission);
      console.log('Timeline Data:', timelineData);
      console.log('==========================================');
    }
  }, [submission?.id, timelineData]);

  // 휠 줌
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * delta));
    setZoomLevel(newZoom);
  };

  const adjustZoom = (delta: number) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel + delta));
    setZoomLevel(newZoom);
  };

  // 모달 재오픈 시 줌/타임라인 초기화
  const resetState = () => {
    setZoomLevel(1);
    setIsTimelineExpanded(true);
  };

  // submission이 변경될 때 상태 리셋
  useEffect(() => {
    resetState();
  }, [submission?.id]);

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* 헤더 */}
      <div className="modal-header flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-gradient-to-r from-white to-gray-50">
        <h2 className="text-lg font-bold text-gray-900 flex-1 pr-4 line-clamp-2" title={submission.title}>
          {submission.title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          {/* 줌 컨트롤 */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => adjustZoom(-0.1)}
              className="h-7 w-7 p-0 hover:bg-white"
              disabled={zoomLevel <= MIN_ZOOM}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium text-gray-600 min-w-[45px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => adjustZoom(0.1)}
              className="h-7 w-7 p-0 hover:bg-white"
              disabled={zoomLevel >= MAX_ZOOM}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(1)}
              className="h-7 w-7 p-0 hover:bg-white ml-1"
              disabled={zoomLevel === 1}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="w-px h-6 bg-gray-300" />

          {/* 닫기 버튼 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 메인 스크롤 영역 - 타임라인 + 본문 */}
      <div
        ref={mainScrollRef}
        className="flex-1 overflow-auto p-6 bg-gradient-to-br from-gray-50 to-white"
        onWheel={handleWheel}
      >
        {/* 결재 타임라인 */}
        <div className="mb-6">
          <TimelineViewer
            timelineData={timelineData}
            progress={progress}
            isExpanded={isTimelineExpanded}
            onToggle={() => setIsTimelineExpanded(!isTimelineExpanded)}
          />
        </div>

        {/* 본문 */}
        <div className="relative bg-white rounded-xl shadow-inner border border-gray-200 p-6">
          {/* 실제 가로 스크롤이 걸리는 래퍼 */}
          <div ref={contentScrollRef} className="overflow-x-auto">
            <div
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: "left top",
              }}
              className="inline-block"
            >
              {/* 여기 width 고정 */}
              <div
                className="prose prose-sm max-w-none w-[1100px]"
                dangerouslySetInnerHTML={{
                  __html:
                    submission.content ||
                    `
                    <div class="flex items-center justify-center h-32 text-gray-400">
                      <div class="text-center">
                        <svg class="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>내용이 없습니다</p>
                      </div>
                    </div>
                  `,
                }}
              />
            </div>
          </div>
        </div>

        {/* 조작 힌트 */}
        <div className="mt-4 flex justify-end">
          <div className="bg-gray-900/80 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
            <span className="opacity-70">드래그:</span> 텍스트 선택
            <span className="mx-2 opacity-50">|</span>
            <span className="opacity-70">휠:</span> 스크롤
            <span className="mx-2 opacity-50">|</span>
            <span className="opacity-70">Ctrl+휠:</span> 확대/축소
          </div>
        </div>
      </div>
    </div>
  );
}
