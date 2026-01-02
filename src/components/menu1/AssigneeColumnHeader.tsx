import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import type { ColumnFilter } from "./ColumnHeader";
import type { Calendar } from "@/types/menu1.types";

interface AssigneeColumnHeaderProps {
  column: string;
  title: string;
  data: string[]; // knox_id 배열
  empInfoData: Calendar[]; // 직원 정보
  onFilterChange: (column: string, values: string[], sortOrder?: 'asc' | 'desc') => void;
  currentFilter?: ColumnFilter;
}

export default function AssigneeColumnHeader({
  column,
  title,
  data,
  empInfoData,
  onFilterChange,
  currentFilter
}: AssigneeColumnHeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedKnoxId, setSelectedKnoxId] = useState<string>(currentFilter?.values?.[0] || "");
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(currentFilter?.sortOrder);
  const [isOpen, setIsOpen] = useState(false);

  // knox_id → 이름 매핑 생성
  const employeeMap = useMemo(() => {
    const map = new Map<string, Calendar>();
    empInfoData.forEach(emp => {
      map.set(String(emp.knox_id), emp);
    });
    return map;
  }, [empInfoData]);

  // knox_id → 이름으로 변환된 목록
  const assigneeOptions = useMemo(() => {
    return data.map(knoxId => ({
      knoxId,
      name: employeeMap.get(knoxId)?.name || knoxId
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, employeeMap]);

  // 검색어로 필터링
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return assigneeOptions;
    const searchLower = searchTerm.toLowerCase();
    return assigneeOptions.filter(option =>
      option.name.toLowerCase().includes(searchLower)
    );
  }, [assigneeOptions, searchTerm]);

  const handleApply = () => {
    // knox_id로 필터링 (이름이 아닌!)
    // 단일 선택이므로 배열로 감싸서 전달
    onFilterChange(column, selectedKnoxId ? [selectedKnoxId] : [], sortOrder);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedKnoxId("");
    setSortOrder(undefined);
    onFilterChange(column, [], undefined);
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-full data-[state=open]:bg-accent text-xs p-1">
          {title}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        <div className="p-2">
          <div className="flex gap-1 mb-2">
            <Button
              variant={sortOrder === 'asc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortOrder('asc')}
              className="flex-1"
            >
              오름차순
            </Button>
            <Button
              variant={sortOrder === 'desc' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortOrder('desc')}
              className="flex-1"
            >
              내림차순
            </Button>
          </div>

          <Input
            placeholder="이름 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="mb-2"
          />

          <RadioGroup value={selectedKnoxId} onValueChange={setSelectedKnoxId} className="max-h-40 overflow-y-auto space-y-1">
            {filteredOptions.map((option) => (
              <div key={option.knoxId} className="flex items-center space-x-2">
                <RadioGroupItem value={option.knoxId} id={`assignee-${option.knoxId}`} />
                <Label htmlFor={`assignee-${option.knoxId}`} className="text-sm cursor-pointer flex-1">
                  {option.name}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <DropdownMenuSeparator />

          <div className="flex gap-1 mt-2">
            <Button size="sm" onClick={handleApply}>적용</Button>
            <Button size="sm" variant="outline" onClick={handleClear}>취소</Button>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
