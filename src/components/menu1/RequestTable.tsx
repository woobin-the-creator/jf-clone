import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ColumnHeader, { type ColumnFilter } from "@/components/menu1/ColumnHeader";
import SelectAssignee from "@/components/menu1/SelectAssignee";
import type { RequestSubmission, Calendar } from "@/types/menu1.types";
import { FIXED_WIDTHS, formatDate, getUniqueValues, calculateMaxAssigneeWidth } from "@/utils/menu1.utils";

interface RequestTableProps {
  paginatedData: RequestSubmission[];
  allData: RequestSubmission[] | undefined;
  empInfoData: Calendar[];
  isLoading: boolean;
  isPageTransitioning: boolean;
  columnFilters: ColumnFilter[];
  onColumnFilter: (column: string, values: string[], sortOrder?: "asc" | "desc") => void;
  onRowClick: (submission: RequestSubmission) => void;
  onAssigneeChange: (id: number, assignee: string) => void;
}

export default function RequestTable({
  paginatedData,
  allData,
  empInfoData,
  isLoading,
  isPageTransitioning,
  columnFilters,
  onColumnFilter,
  onRowClick,
  onAssigneeChange,
}: RequestTableProps) {
  const maxAssigneeWidth = calculateMaxAssigneeWidth(paginatedData, empInfoData);

  return (
    <div
      className={[
        "w-full overflow-x-auto rounded-xl border border-gray-200",
        "transition-all duration-200 ease-out will-change-transform",
        isPageTransitioning ? "opacity-70 translate-y-[2px]" : "opacity-100 translate-y-0",
      ].join(" ")}
    >
      <Table className="w-full table-auto">
        <TableHeader className="bg-gray-50">
          <TableRow className="hover:bg-gray-50">
            <TableHead className={`${FIXED_WIDTHS.lineId} text-sm border-r border-gray-200 text-center whitespace-nowrap px-2`}>
              <ColumnHeader
                column="line_id"
                title="Line ID"
                data={getUniqueValues(allData, "line_id")}
                onFilterChange={onColumnFilter}
                currentFilter={columnFilters.find((f) => f.column === "line_id")}
              />
            </TableHead>

            <TableHead className={`${FIXED_WIDTHS.ppid} text-sm border-r border-gray-200 text-center whitespace-nowrap px-2`}>
              <ColumnHeader
                column="ppid"
                title="PPID"
                data={getUniqueValues(allData, "ppid")}
                onFilterChange={onColumnFilter}
                currentFilter={columnFilters.find((f) => f.column === "ppid")}
              />
            </TableHead>

            <TableHead className={`${FIXED_WIDTHS.maxTat} text-sm border-r border-gray-200 text-center whitespace-nowrap px-2`}>
              <ColumnHeader
                column="Max_TAT"
                title="Max TAT"
                data={getUniqueValues(allData, "Max_TAT")}
                onFilterChange={onColumnFilter}
                currentFilter={columnFilters.find((f) => f.column === "Max_TAT")}
              />
            </TableHead>

            <TableHead className="text-sm border-r border-gray-200 text-center whitespace-nowrap px-2">
              <ColumnHeader
                column="change_request_items"
                title="변경의뢰 항목"
                data={getUniqueValues(allData, "change_request_items")}
                onFilterChange={onColumnFilter}
                currentFilter={columnFilters.find((f) => f.column === "change_request_items")}
              />
            </TableHead>

            <TableHead className="text-sm border-r border-gray-200 text-center min-w-[255px] max-w-[25%]">
              제목
            </TableHead>

            <TableHead className={`${FIXED_WIDTHS.submittedBy} text-sm border-r border-gray-200 text-center whitespace-nowrap px-2`}>
              <ColumnHeader
                column="submitted_by"
                title="의뢰자"
                data={getUniqueValues(allData, "submitted_by")}
                onFilterChange={onColumnFilter}
                currentFilter={columnFilters.find((f) => f.column === "submitted_by")}
              />
            </TableHead>

            <TableHead className={`${FIXED_WIDTHS.submittedAt} text-sm border-r border-gray-200 text-center whitespace-nowrap px-2`}>
              <ColumnHeader
                column="submitted_at"
                title="의뢰날짜"
                data={getUniqueValues(allData, "submitted_at").map((date: string) => formatDate(date))}
                onFilterChange={onColumnFilter}
                currentFilter={columnFilters.find((f) => f.column === "submitted_at")}
              />
            </TableHead>

            <TableHead className={`${FIXED_WIDTHS.status} text-sm border-r border-gray-200 text-center whitespace-nowrap px-2`}>
              <ColumnHeader
                column="status"
                title="Status"
                data={getUniqueValues(allData, "status")}
                onFilterChange={onColumnFilter}
                currentFilter={columnFilters.find((f) => f.column === "status")}
              />
            </TableHead>

            <TableHead className="text-sm text-center whitespace-nowrap px-2" style={{ minWidth: `${maxAssigneeWidth}px` }}>
              담당자
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            // Loading Skeleton
            Array.from({ length: 15 }).map((_, index) => (
              <TableRow key={index}>
                <TableCell className={`${FIXED_WIDTHS.lineId} p-2 border-r border-gray-200 text-center`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className={`${FIXED_WIDTHS.ppid} p-2 border-r border-gray-200 text-center`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className={`${FIXED_WIDTHS.maxTat} p-2 border-r border-gray-200 text-center`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className="p-2 border-r border-gray-200 text-center">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className="p-2 border-r border-gray-200 text-left min-w-[255px]">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className={`${FIXED_WIDTHS.submittedBy} p-2 border-r border-gray-200 text-center`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className={`${FIXED_WIDTHS.submittedAt} p-2 border-r border-gray-200 text-center`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className={`${FIXED_WIDTHS.status} p-2 border-r border-gray-200 text-center`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
                <TableCell className="p-2 text-center">
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              </TableRow>
            ))
          ) : paginatedData.length === 0 ? (
            // Empty State
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10">
                <div className="text-gray-500">검색 조건에 맞는 데이터가 없습니다.</div>
              </TableCell>
            </TableRow>
          ) : (
            // Data Rows
            paginatedData.map((submission) => (
              <TableRow
                key={submission.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onRowClick(submission)}
              >
                <TableCell className={`${FIXED_WIDTHS.lineId} font-mono text-sm p-2 border-r border-gray-200 text-center whitespace-nowrap`}>
                  {submission.line_id || "-"}
                </TableCell>

                <TableCell className={`${FIXED_WIDTHS.ppid} font-mono text-sm p-2 border-r border-gray-200 text-center whitespace-nowrap`}>
                  {submission.ppid || "-"}
                </TableCell>

                <TableCell className={`${FIXED_WIDTHS.maxTat} font-mono text-lg p-2 border-r border-gray-200 text-center font-semibold whitespace-nowrap`}>
                  {submission.Max_TAT || "-"}
                </TableCell>

                <TableCell className="text-sm text-gray-700 p-2 border-r border-gray-200 text-center whitespace-nowrap" title={submission.change_request_items || "-"}>
                  {submission.change_request_items || "-"}
                </TableCell>

                <TableCell className="border-r border-gray-200 text-left min-w-[255px] max-w-[25%]">
                  <span
                    title={submission.title}
                    className="block overflow-hidden leading-5"
                    style={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      maxHeight: "40px",
                    }}
                  >
                    {submission.title}
                  </span>
                </TableCell>

                <TableCell className={`${FIXED_WIDTHS.submittedBy} border-r border-gray-200 text-center whitespace-nowrap`}>
                  <Badge variant="outline" className="text-sm">
                    {submission.submitted_by}
                  </Badge>
                </TableCell>

                <TableCell className={`${FIXED_WIDTHS.submittedAt} text-base text-gray-600 border-r border-gray-200 text-center whitespace-nowrap`}>
                  {formatDate(submission.submitted_at)}
                </TableCell>

                <TableCell className={`${FIXED_WIDTHS.status} p-2 text-center border-r border-gray-200 whitespace-nowrap`}>
                  <Badge
                    variant={
                      submission.status === "내부결재대기중"
                        ? "first_step"
                        : submission.status === "JOB 검토,배정 대기"
                        ? "second_step"
                        : submission.status === "JOB 수정 대기"
                        ? "third_step"
                        : submission.status === "반려"
                        ? "reject_step"
                        : submission.status === "작성완료"
                        ? "complete_step"
                        : "outline"
                    }
                    className="text-xs px-2 py-1 inline-flex items-center justify-center w-[110px] h-[45px] whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {submission.status || "내부결재대기중"}
                  </Badge>
                </TableCell>

                <TableCell
                  onClick={(e) => e.stopPropagation()}
                  className="text-center whitespace-nowrap"
                  style={{ minWidth: `${maxAssigneeWidth}px` }}
                >
                  <SelectAssignee submission={submission} onAssigneeChange={onAssigneeChange} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
