import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { RequestSubmission } from "@shared/schema";
import { formatDateTime } from "./DashboardUtils";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/types/menu1.types";
import { convertKnoxIdToName } from "@/utils/menu1.utils";

interface WhatsNewSectionProps {
  submissions: RequestSubmission[];
  isLoading: boolean;
}

export default function WhatsNewSection({ submissions, isLoading }: WhatsNewSectionProps) {
  // empInfoData 조회 (knox_id → name 변환용)
  const { data: empInfoData = [] } = useQuery<Calendar[]>({
    queryKey: ["/api/calendar"],
  });

  // knox_id → Calendar 매핑 생성 (useMemo로 최적화)
  const employeeMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    empInfoData.forEach((emp) => {
      map.set(emp.knox_id, emp);
    });
    return map;
  }, [empInfoData]);

  // 담당자 컬럼 동적 width 계산 (가장 긴 담당자 이름 기준)
  const assigneeWidth = useMemo(() => {
    if (submissions.length === 0) return 70; // 기본값

    const maxLength = submissions.reduce((max, sub) => {
      const assigneeName = convertKnoxIdToName(sub.assignee, employeeMap);
      return Math.max(max, assigneeName.length);
    }, 0);

    // 한글 1글자 ≈ 14px + 좌우 padding 32px, 최소 70px
    return Math.max(70, maxLength * 14 + 32);
  }, [submissions, employeeMap]);

  return (
    <div className="mb-10">
      <Card
        className="
          backdrop-blur-xl bg-white/40
          shadow-[0_4px_30px_rgba(0,0,0,0.1)]
          border border-white/30
          rounded-2xl transition-all
        "
      >
        <CardHeader className="pb-3">
          <CardTitle
            className="
              text-xl font-semibold text-gray-900
              flex items-center gap-2 tracking-tight
            "
          >
            <Sparkles className="h-5 w-5 text-indigo-500" />
            What's New
          </CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full rounded-lg bg-white/60" />
              <Skeleton className="h-9 w-full rounded-lg bg-white/60" />
              <Skeleton className="h-9 w-full rounded-lg bg-white/60" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200/60">
              {submissions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8 tracking-wide">
                  오늘 업데이트된 의뢰가 없습니다
                </p>
              ) : (
                <table className="w-full text-gray-900">
                  <thead>
                    <tr className="bg-indigo-50/70 border-b-2 border-indigo-200/50">
                      <th className="w-[70px] text-center py-3 px-4 text-sm font-semibold text-indigo-900 tracking-tight whitespace-nowrap border-r border-gray-200/50">
                        Line ID
                      </th>
                      <th className="w-[80px] text-center py-3 px-4 text-sm font-semibold text-indigo-900 tracking-tight whitespace-nowrap border-r border-gray-200/50">
                        PPID
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-indigo-900 tracking-tight border-r border-gray-200/50">
                        의뢰 제목
                      </th>
                      <th className="w-[70px] text-center py-3 px-4 text-sm font-semibold text-indigo-900 tracking-tight whitespace-nowrap border-r border-gray-200/50">
                        의뢰자
                      </th>
                      <th
                        className="text-center py-3 px-4 text-sm font-semibold text-indigo-900 tracking-tight whitespace-nowrap border-r border-gray-200/50"
                        style={{ width: `${assigneeWidth}px` }}
                      >
                        담당자
                      </th>
                      <th className="w-[130px] text-center py-3 px-4 text-sm font-semibold text-indigo-900 tracking-tight whitespace-nowrap border-r border-gray-200/50">
                        상태
                      </th>
                      <th className="w-[150px] text-center py-3 px-4 text-sm font-semibold text-indigo-900 tracking-tight whitespace-nowrap">
                        수정된 시각
                      </th>
                    </tr>
                  </thead>

                  <tbody className="bg-white/30">
                    {submissions.map((submission, index) => (
                      <tr
                        key={submission.id}
                        onClick={() => {
                          const encoded = encodeURIComponent(submission.title);
                          window.location.href = `/menu1?search=${encoded}`;
                        }}
                        className={`
                          hover:bg-indigo-50/40
                          transition-all
                          cursor-pointer
                          ${index !== submissions.length - 1 ? 'border-b border-gray-200/40' : ''}
                        `}
                      >
                        <td className="w-[70px] py-3 px-4 text-sm whitespace-nowrap border-r border-gray-200/40">{submission.line_id || '-'}</td>
                        <td className="w-[80px] py-3 px-4 text-sm whitespace-nowrap border-r border-gray-200/40">{submission.ppid || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium truncate border-r border-gray-200/40">{submission.title}</td>
                        <td className="w-[70px] py-3 px-4 text-sm whitespace-nowrap border-r border-gray-200/40">{submission.submitted_by || '-'}</td>
                        <td
                          className="py-3 px-4 text-sm whitespace-nowrap border-r border-gray-200/40"
                          style={{ width: `${assigneeWidth}px` }}
                        >
                          {convertKnoxIdToName(submission.assignee, employeeMap)}
                        </td>
                        <td className="w-[130px] py-3 px-4 text-sm whitespace-nowrap border-r border-gray-200/40">{submission.status}</td>
                        <td className="w-[150px] py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                          {formatDateTime(submission.updated_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
