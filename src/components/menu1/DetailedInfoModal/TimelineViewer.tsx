// components/menu1/DetailedInfoModal/TimelineViewer.tsx
import { Button } from "@/components/ui/button";
import {
  Clock,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  CheckCheck,
  AlertCircle,
  PlayCircle,
  Ban,
} from "lucide-react";
import type { TimelineRow, TimelineProgress } from "./Timeline.types";

interface TimelineViewerProps {
  timelineData: TimelineRow[];
  progress: TimelineProgress;
  isExpanded: boolean;
  onToggle: () => void;
}


const getTimelineStatusStyle = (statusType: TimelineRow["statusType"]): string => {
  switch (statusType) {
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "waiting":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    case "canceled":
      return "bg-gray-50 text-gray-700 border-gray-200";
    case "pending":
      return "bg-slate-50 text-slate-500 border-slate-200";
    default:
      return "bg-gray-50 text-gray-400 border-gray-200";
  }
};

/**
 * 타임라인 순서 번호 스타일 반환
 */
const getTimelineLineStyle = (statusType: TimelineRow["statusType"]): string => {
  switch (statusType) {
    case "completed":
      return "bg-emerald-400";
    case "waiting":
      return "bg-amber-400";
    case "rejected":
      return "bg-rose-400";
    case "canceled":
      return "bg-gray-400";
    default:
      return "bg-gray-200";
  }
};

/**
 * 타임라인 단계 아이콘 반환
 */
const getStepIcon = (statusType: TimelineRow["statusType"]) => {
  switch (statusType) {
    case "completed":
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    case "waiting":
      return <Clock className="w-4 h-4 text-amber-600 animate-pulse" />;
    case "rejected":
      return <XCircle className="w-4 h-4 text-rose-600" />;
    case "canceled":
      return <Ban className="w-4 h-4 text-gray-600" />;
    default:
      return null;
  }
};

/**
 * 텍스트 내 URL을 클릭 가능한 링크로 변환
 * @param text - 변환할 텍스트
 * @returns React 요소 배열
 */
const renderTextWithLinks = (text: string): React.ReactNode => {
  if (!text || text === "-") {
    return <span className="text-gray-300">-</span>;
  }

  // URL 패턴 정규식 (http, https, www로 시작하는 URL 감지)
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  const parts = text.split(urlRegex);
  const matches = text.match(urlRegex) || [];

  const result: React.ReactNode[] = [];
  let matchIndex = 0;

  parts.forEach((part, index) => {
    if (part) {
      // URL인지 확인
      if (urlRegex.test(part)) {
        // www로 시작하면 https:// 추가
        const href = part.startsWith("www.") ? `https://${part}` : part;
        result.push(
          <a
            key={`link-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      } else {
        result.push(<span key={`text-${index}`}>{part}</span>);
      }
    }

    // 매칭된 URL 추가 (split으로 인해 별도 처리 필요)
    if (matches[matchIndex] && part === matches[matchIndex]) {
      matchIndex++;
    }
  });

  return result.length > 0 ? result : text;
};

/**
 * 결재 타임라인 뷰어 컴포넌트
 *
 * 접힌 상태에서는 진행률 바와 현재 상태를 표시하고,
 * 펼친 상태에서는 전체 타임라인 테이블을 표시합니다.
 */
export const TimelineViewer = ({
  timelineData,
  progress,
  isExpanded,
  onToggle,
}: TimelineViewerProps) => {
  return (
    <div className="bg-gray-50/80 rounded-xl border border-gray-100 overflow-hidden">
      {/* 헤더 (접기/펼치기 버튼 포함) */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100/50 transition-colors select-none"
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        <div className="flex items-center gap-3 flex-1">
          <Clock className="w-5 h-5 text-gray-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base font-semibold text-gray-600 uppercase tracking-wider">
                결재 타임라인
              </span>
              {!isExpanded && (
                <span className="text-xs font-medium text-gray-500">
                  {progress.completedSteps}/{progress.totalSteps} 단계
                </span>
              )}
            </div>

            {/* 접힌 상태: 진행률 바 + 현재 상태 */}
            {!isExpanded && (
              <div className="space-y-2">
                {/* 진행률 바 */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        progress.isRejected
                          ? "bg-rose-500"
                          : progress.isCanceled
                          ? "bg-gray-500"
                          : progress.percentage === 100
                          ? "bg-emerald-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 min-w-[45px] text-right">
                    {progress.percentage}%
                  </span>
                </div>

                {/* 현재 상태 */}
                <div className="flex items-center gap-2 text-sm">
                  {progress.isRejected ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600" />
                      <span className="font-medium text-rose-700">
                        {progress.currentStepStatus}: {progress.currentStepName}
                      </span>
                    </>
                  ) : progress.isCanceled ? (
                    <>
                      <Ban className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-gray-700">
                        {progress.currentStepStatus}: {progress.currentStepName}
                      </span>
                    </>
                  ) : progress.percentage === 100 ? (
                    <>
                      <CheckCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-emerald-700">완료</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-blue-700">
                        {progress.currentStepStatus}: {progress.currentStepName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 접기/펼치기 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 shrink-0 ml-2"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </Button>
      </div>

      {/* 타임라인 테이블 (펼친 상태) */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          maxHeight: isExpanded ? "500px" : "0px",
          opacity: isExpanded ? 1 : 0,
        }}
      >
        <div className="px-4 pb-4">
          <table className="w-full text-base">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left py-2 px-2 font-medium w-12">순서</th>
                <th className="text-left py-2 px-2 font-medium w-40">구분</th>
                <th className="text-left py-2 px-2 font-medium w-20">상태</th>
                <th className="text-left py-2 px-2 font-medium w-32">담당자</th>
                <th className="text-left py-2 px-2 font-medium w-28">일시</th>
                <th className="text-left py-2 px-2 font-medium">내용</th>
              </tr>
            </thead>
            <tbody>
              {timelineData.map((row) => (
                <tr
                  key={row.order}
                  className={`border-b border-gray-100 last:border-0 transition-colors ${
                    row.statusType === "waiting" ? "bg-amber-50/50 shadow-sm" : ""
                  }`}
                >
                  {/* 순서 */}
                  <td className="py-3 px-2 align-top">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${getTimelineLineStyle(
                          row.statusType
                        )}`}
                      >
                        {row.order}
                      </div>
                    </div>
                  </td>

                  {/* 구분 */}
                  <td className="py-3 px-2 align-top">
                    <div className="flex items-center gap-2">
                      {getStepIcon(row.statusType)}
                      <span
                        className={`font-medium ${
                          row.statusType === "waiting" ? "text-gray-900" : "text-gray-800"
                        }`}
                      >
                        {row.category}
                      </span>
                    </div>
                  </td>

                  {/* 상태 */}
                  <td className="py-3 px-2 align-top">
                    {row.status !== "-" ? (
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${getTimelineStatusStyle(
                          row.statusType
                        )}`}
                      >
                        {row.status}
                      </span>
                    ) : (
                      <span className="text-gray-300">-</span>
                    )}
                  </td>

                  {/* 담당자 - 줄바꿈 허용 */}
                  <td className="py-3 px-2 align-top">
                    <span
                      className={`${
                        row.assignee === "-" ? "text-gray-300" : "text-gray-700"
                      } whitespace-normal break-words`}
                    >
                      {row.assignee}
                    </span>
                  </td>

                  {/* 일시 */}
                  <td className="py-3 px-2 align-top">
                    <span
                      className={`${row.datetime === "-" ? "text-gray-300" : "text-gray-600"}`}
                    >
                      {row.datetime}
                    </span>
                  </td>

                  {/* 내용 - 줄바꿈 허용 + URL 하이퍼링크 변환 */}
                  <td className="py-3 px-2 align-top">
                    <div className="text-gray-600 whitespace-normal break-words">
                      {renderTextWithLinks(row.content || "-")}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
