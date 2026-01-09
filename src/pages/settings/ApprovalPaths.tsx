import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Users, UserPlus, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Calendar {
  name: string;
  employee_number: string;
  part: string;
  knox_id: string;
}

interface AssigneeMember {
  id?: number;
  knox_id: string;
  name: string;
  employee_number: string;
  created_at?: string;
}

export default function ApprovalPaths() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<AssigneeMember[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // 전체 임직원 목록 조회
  const { data: employees = [], isLoading: isLoadingEmployees } = useQuery<Calendar[]>({
    queryKey: ["/api/calendar"],
  });

  // 저장된 담당자 멤버 목록 조회
  const { data: savedMembers = [], isLoading: isLoadingMembers } = useQuery<AssigneeMember[]>({
    queryKey: ["/api/assignee-members"],
  });

  // 저장된 멤버 목록이 로드되면 상태에 반영
  useMemo(() => {
    if (savedMembers.length > 0 && selectedMembers.length === 0 && !hasChanges) {
      setSelectedMembers(savedMembers);
    }
  }, [savedMembers]);

  // 멤버 목록 저장 mutation
  const saveMembersMutation = useMutation({
    mutationFn: async (members: AssigneeMember[]) => {
      const response = await fetch("/api/assignee-members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          members: members.map((m) => ({
            knox_id: m.knox_id,
            name: m.name,
            employee_number: m.employee_number,
          })),
        }),
      });
      if (!response.ok) throw new Error("저장 실패");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignee-members"] });
      setHasChanges(false);
      toast({
        title: "저장 완료",
        description: "담당자 멤버 목록이 저장되었습니다.",
      });
    },
    onError: () => {
      toast({
        title: "저장 실패",
        description: "담당자 멤버 목록 저장에 실패했습니다.",
        variant: "destructive",
      });
    },
  });

  // 검색 필터링된 임직원 목록
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const term = searchTerm.toLowerCase();
    return employees
      .filter(
        (emp) =>
          emp.name.toLowerCase().includes(term) ||
          emp.employee_number.includes(term) ||
          emp.part.toLowerCase().includes(term)
      )
      .slice(0, 50); // 최대 50개까지만 표시
  }, [employees, searchTerm]);

  // 이미 추가된 멤버인지 확인
  const isAlreadyAdded = (knoxId: string) => {
    return selectedMembers.some((m) => m.knox_id === knoxId);
  };

  // 멤버 추가
  const handleAddMember = (employee: Calendar) => {
    if (isAlreadyAdded(employee.knox_id)) return;

    setSelectedMembers((prev) => [
      ...prev,
      {
        knox_id: employee.knox_id,
        name: employee.name,
        employee_number: employee.employee_number,
      },
    ]);
    setHasChanges(true);
  };

  // 멤버 삭제
  const handleRemoveMember = (knoxId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.knox_id !== knoxId));
    setHasChanges(true);
  };

  // 저장
  const handleSave = () => {
    saveMembersMutation.mutate(selectedMembers);
  };

  const isLoading = isLoadingEmployees || isLoadingMembers;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">담당자 멤버 관리</h1>
          <p className="text-muted-foreground mt-1">
            의뢰 배정 시 선택 가능한 담당자 목록을 관리합니다.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saveMembersMutation.isPending}
          className="gap-2"
        >
          {saveMembersMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          저장하기
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 임직원 검색 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              임직원 검색
            </CardTitle>
            <CardDescription>
              이름, 사번, 부서로 검색하여 담당자를 추가할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="이름, 사번 또는 부서 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <ScrollArea className="h-[400px] border rounded-md">
              {isLoadingEmployees ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : searchTerm.trim() === "" ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <Search className="h-8 w-8 mb-2" />
                  <p className="text-center">검색어를 입력하여</p>
                  <p className="text-center">임직원을 검색하세요</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <p>검색 결과가 없습니다.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredEmployees.map((emp) => {
                    const added = isAlreadyAdded(emp.knox_id);
                    return (
                      <div
                        key={emp.knox_id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          added
                            ? "bg-muted/50 border-muted"
                            : "hover:bg-accent cursor-pointer"
                        }`}
                        onClick={() => !added && handleAddMember(emp)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{emp.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {emp.employee_number} | {emp.part}
                          </div>
                        </div>
                        {added ? (
                          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                            추가됨
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddMember(emp);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                  {filteredEmployees.length === 50 && (
                    <p className="text-center text-sm text-muted-foreground py-2">
                      검색어를 더 구체적으로 입력해주세요.
                    </p>
                  )}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* 우측: 담당자 멤버 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              담당자 멤버 목록
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {selectedMembers.length}명
              </span>
            </CardTitle>
            <CardDescription>
              SelectAssignee 드롭다운에 표시될 담당자 목록입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] border rounded-md">
              {isLoadingMembers ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : selectedMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
                  <Users className="h-8 w-8 mb-2" />
                  <p className="text-center">등록된 담당자가 없습니다.</p>
                  <p className="text-center text-sm">좌측에서 임직원을 검색하여 추가하세요.</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.knox_id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{member.name}</div>
                        <div className="text-sm text-muted-foreground truncate">
                          {member.employee_number}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveMember(member.knox_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {hasChanges && (
              <p className="text-sm text-amber-600 mt-3 flex items-center gap-1">
                <span className="inline-block w-2 h-2 bg-amber-500 rounded-full" />
                저장되지 않은 변경사항이 있습니다.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
