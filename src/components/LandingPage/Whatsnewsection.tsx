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
            <div className="overflow-x-auto">
              {submissions.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8 tracking-wide">
                  오늘 업데이트된 의뢰가 없습니다
                </p>
              ) : (
                <table className="w-full text-gray-900 table-fixed">
                  <thead>
                    <tr className="border-b border-gray-200/50">
                      <th className="w-[70px] text-center py-3 px-4 text-sm font-medium text-gray-700 tracking-tight whitespace-nowrap">
                        Line ID
                      </th>
                      <th className="w-[80px] text-center py-3 px-4 text-sm font-medium text-gray-700 tracking-tight whitespace-nowrap">
                        PPID
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 tracking-tight">
                        의뢰 제목
                      </th>
                      <th className="w-[70px] text-center py-3 px-4 text-sm font-medium text-gray-700 tracking-tight whitespace-nowrap">
                        의뢰자
                      </th>
                      <th className="text-center py-3 px-4 text-sm font-medium text-gray-700 tracking-tight">
                        담당자
                      </th>
                      <th className="w-[130px] text-center py-3 px-4 text-sm font-medium text-gray-700 tracking-tight whitespace-nowrap">
                        상태
                      </th>
                      <th className="w-[150px] text-center py-3 px-4 text-sm font-medium text-gray-700 tracking-tight whitespace-nowrap">
                        수정된 시각
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {submissions.map((submission) => (
                      <tr
                        key={submission.id}
                        onClick={() => {
                          const encoded = encodeURIComponent(submission.title);
                          window.location.href = `/menu1?search=${encoded}`;
                        }}
                        className="
                          border-b border-gray-100/40
                          hover:bg-white/60
                          transition-all
                          rounded-xl
                          cursor-pointer
                        "
                      >
                        <td className="w-[70px] py-3 px-4 text-sm whitespace-nowrap">{submission.line_id || '-'}</td>
                        <td className="w-[80px] py-3 px-4 text-sm whitespace-nowrap">{submission.ppid || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium truncate">{submission.title}</td>
                        <td className="w-[70px] py-3 px-4 text-sm whitespace-nowrap">{submission.submitted_by || '-'}</td>
                        <td className="py-3 px-4 text-sm truncate">{convertKnoxIdToName(submission.assignee, employeeMap)}</td>
                        <td className="w-[130px] py-3 px-4 text-sm whitespace-nowrap">{submission.status}</td>
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
