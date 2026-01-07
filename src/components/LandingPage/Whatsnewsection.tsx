import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import { RequestSubmission } from "@shared/schema";
import { formatDateTime } from "./DashboardUtils";
import { useQuery } from "@tanstack/react-query";
import { Calendar } from "@/types/menu1.types";

interface WhatsNewSectionProps {
  submissions: RequestSubmission[];
  isLoading: boolean;
}

/**
 * knox_id를 이름으로 변환하는 함수
 * menu1.utils.ts의 변환 로직과 동일한 패턴 사용
 */
const convertKnoxIdToName = (
  knoxIdStr: string | undefined,
  employeeMap: Map<string, Calendar>
): string => {
  if (!knoxIdStr) return "-";

  const names = knoxIdStr
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map((id) => employeeMap.get(id)?.name || id);

  return names.length > 0 ? names.join(", ") : "-";
};

export default function WhatsNewSection({ submissions, isLoading }: WhatsNewSectionProps) {
  // empInfoData 조회 (knox_id → name 변환용)
  const { data: empInfoData = [] } = useQuery<Calendar[]>({
    queryKey: ["/api/calendar"],
  });

  // knox_id → Calendar 매핑 생성
  const employeeMap = new Map<string, Calendar>();
  empInfoData.forEach((emp) => {
    employeeMap.set(String(emp.knox_id), emp);
  });

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
                <table className="w-full text-gray-900">
                  <thead>
                    <tr className="border-b border-gray-200/50">
                      {["Line ID", "PPID", "의뢰 제목", "의뢰자", "담당자", "상태", "수정된 시각"].map((header) => (
                        <th
                          key={header}
                          className="text-left py-3 px-4 text-sm font-medium text-gray-700 tracking-tight"
                        >
                          {header}
                        </th>
                      ))}
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
                        <td className="py-3 px-4 text-sm">{submission.line_id || '-'}</td>
                        <td className="py-3 px-4 text-sm">{submission.ppid || '-'}</td>
                        <td className="py-3 px-4 text-sm font-medium">{submission.title}</td>
                        <td className="py-3 px-4 text-sm">{submission.submitted_by || '-'}</td>
                        <td className="py-3 px-4 text-sm">{convertKnoxIdToName(submission.assignee, employeeMap)}</td>
                        <td className="py-3 px-4 text-sm">{submission.status}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
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
