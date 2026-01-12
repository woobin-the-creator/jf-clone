import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";

interface RequestSubmission {
  id: number;
  status?: string;
  assignee?: string;
}

interface AssigneeMember {
  id?: number;
  knox_id: string;
  name: string;
  employee_number: string;
  created_at?: string;
}

interface SelectAssigneeProps {
  submission: RequestSubmission;
  onAssigneeChange: (id: number, assignees: string) => void;
}

export default function SelectAssignee({ submission, onAssigneeChange }: SelectAssigneeProps) {
  const { user } = useAuth();
  const isManager = user?.auth === "MANAGER";
  // 상태 체크 조건 제거 - 매니저면 언제든지 수정 가능
  const canSelect = isManager;

  const [isOpen, setIsOpen] = useState(false);
  const [selectedKnoxIds, setSelectedKnoxIds] = useState<string[]>([]);

  // 담당자 멤버 목록 조회 (ApprovalPaths에서 설정한 멤버들)
  const { data: assigneeMembers = [], isLoading } = useQuery<AssigneeMember[]>({
    queryKey: ['/api/assignee-members'],
  });

  const memberByKnoxId = useMemo(() => {
    const m = new Map<string, AssigneeMember>();
    for (const member of assigneeMembers) m.set(String(member.knox_id), member);
    return m;
  }, [assigneeMembers]);

  const displayNames = useMemo(() => {
    if (selectedKnoxIds.length === 0) return "담당자 선택";

    const names = selectedKnoxIds
      .map(id => memberByKnoxId.get(id)?.name)
      .filter(Boolean);

    return names.join(", ");
  }, [selectedKnoxIds, memberByKnoxId]);

  const hasAssignee = selectedKnoxIds.length > 0;

  useEffect(() => {
    if (submission.assignee) {
      const ids = submission.assignee.split(',').map(id => id.trim()).filter(Boolean);
      setSelectedKnoxIds(ids);
    } else {
      setSelectedKnoxIds([]);
    }
  }, [submission.assignee]);

  const handleToggleAssignee = (knoxId: string) => {
    setSelectedKnoxIds(prev => {
      if (prev.includes(knoxId)) {
        return prev.filter(id => id !== knoxId);
      } else {
        return [...prev, knoxId];
      }
    });
  };

  const handleApply = () => {
    const assigneeString = selectedKnoxIds.join(',');
    onAssigneeChange(submission.id, assigneeString);
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (submission.assignee) {
      const ids = submission.assignee.split(',').map(id => id.trim()).filter(Boolean);
      setSelectedKnoxIds(ids);
    } else {
      setSelectedKnoxIds([]);
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            // [수정] w-full 제거, 내용에 맞게 자동 너비
            "justify-center px-2 min-w-0 inline-flex",
            "!opacity-100",
            hasAssignee
              ? cn(
                  "text-sm font-semibold rounded-2xl border border-input px-3 !text-gray-900",
                  "h-auto py-1",
                  "whitespace-nowrap"
                )
              : cn(
                  "text-xs h-6 whitespace-nowrap",
                  canSelect
                    ? "!text-gray-900 font-semibold"
                    : "!text-gray-500 font-normal"
                )
          )}
          disabled={!canSelect}
        >
          {displayNames}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="담당자 검색..." />
          <CommandEmpty>담당자를 찾을 수 없습니다.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {assigneeMembers.map((member) => (
              <CommandItem
                key={member.knox_id}
                value={member.name}
                onSelect={() => handleToggleAssignee(member.knox_id)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedKnoxIds.includes(member.knox_id)}
                  onCheckedChange={() => handleToggleAssignee(member.knox_id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="flex-1">{member.name}</span>
                {selectedKnoxIds.includes(member.knox_id) && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>

        <div className="flex gap-2 p-2 border-t">
          <Button
            size="sm"
            onClick={handleApply}
            className="flex-1"
          >
            적용 ({selectedKnoxIds.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            취소
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
