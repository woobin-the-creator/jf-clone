import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Search, X, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import type { ReactNode } from "react";

interface DateFilter {
  from: Date | undefined;
  to: Date | undefined;
}

interface FilterControlsProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchApply: () => void;

  dateFilter: DateFilter;
  onDateFilterChange: (dateFilter: DateFilter) => void;

  onDownloadCSV: () => void;
  isDownloadDisabled: boolean;
  isDownloading?: boolean;

  pagination?: ReactNode;
  isBusy?: boolean;
}

export default function FilterControls({
  searchInput,
  onSearchInputChange,
  onSearchApply,
  dateFilter,
  onDateFilterChange,
  onDownloadCSV,
  isDownloadDisabled,
  isDownloading = false,
  pagination,
  isBusy = false,
}: FilterControlsProps) {
  return (
    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Left controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="검색..."
            value={searchInput}
            onChange={(e) => onSearchInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearchApply();
              }
            }}
            className="pl-10"
            disabled={isBusy}
          />
        </div>

        <Button
          variant="outline"
          onClick={onSearchApply}
          className="shrink-0"
          disabled={isBusy}
        >
          Search
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full sm:w-[280px] justify-start text-left font-normal"
              disabled={isBusy}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFilter.from ? (
                dateFilter.to ? (
                  `${format(dateFilter.from, "yyyy-MM-dd")} ~ ${format(dateFilter.to, "yyyy-MM-dd")}`
                ) : (
                  `From: ${format(dateFilter.from, "yyyy-MM-dd")}`
                )
              ) : (
                "날짜 범위 선택"
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 border-b">
              <div className="text-sm font-medium mb-2">날짜 범위 선택</div>
              <div className="text-xs text-gray-500 mb-2">
                시작일과 종료일을 선택하세요
              </div>
              <div className="flex gap-2 text-xs">
                <div className="flex-1">
                  <span className="text-gray-600">시작일:</span>
                  <div className="font-mono">
                    {dateFilter.from ? format(dateFilter.from, "yyyy-MM-dd") : "미선택"}
                  </div>
                </div>
                <div className="flex-1">
                  <span className="text-gray-600">종료일:</span>
                  <div className="font-mono">
                    {dateFilter.to ? format(dateFilter.to, "yyyy-MM-dd") : "미선택"}
                  </div>
                </div>
              </div>
            </div>

            <Calendar
              mode="range"
              selected={{ from: dateFilter.from, to: dateFilter.to }}
              onSelect={(range) => {
                if (!range) {
                  onDateFilterChange({ from: undefined, to: undefined });
                  return;
                }
                onDateFilterChange({ from: range.from, to: range.to });
              }}
              numberOfMonths={2}
              initialFocus
            />

            {(dateFilter.from || dateFilter.to) && (
              <div className="p-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDateFilterChange({ from: undefined, to: undefined })}
                  className="w-full"
                  disabled={isBusy}
                >
                  <X className="mr-2 h-4 w-4" />
                  날짜 필터 제거
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3 sm:ml-auto">
        {/* (1) 배지 삭제 → CSV 버튼을 그 자리로 이동 */}
        <Button
          variant="outline"
          className="gap-2 shrink-0"
          onClick={onDownloadCSV}
          disabled={isDownloadDisabled || isBusy}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {isDownloading ? "다운로드 중..." : "CSV 다운로드"}
        </Button>

        {/* (2) Pagination UI를 기존 CSV 자리(오른쪽 끝)로 이동 */}
        {pagination}
      </div>
    </div>
  );
}
