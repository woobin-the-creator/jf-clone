import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  ListFilter,
  ArrowRight,
  Database,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  useFabInfoRules,
  useFabInfoData,
  type FabInfoRule,
  type FabInfoFilters,
} from "@/hooks/useFabInfoRules";

// ============================================================================
// 규칙 추가 폼 컴포넌트
// ============================================================================

interface RuleFormProps {
  availableEesLineIds: string[];
  isLoading: boolean;
  onSubmit: (targetValue: string, action: "replace" | "delete", newValue?: string) => Promise<void>;
}

function RuleForm({ availableEesLineIds, isLoading, onSubmit }: RuleFormProps) {
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string>("");
  const [action, setAction] = useState<"replace" | "delete">("replace");
  const [newValue, setNewValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // A4: 변경 액션일 때 새 값이 비어있으면 버튼 비활성화
  const isSubmitDisabled =
    !selectedValue ||
    isSubmitting ||
    (action === "replace" && !newValue.trim());

  const handleSubmit = async () => {
    // A7: 변경 전후 값이 같으면 에러 토스트
    if (action === "replace" && selectedValue === newValue.trim()) {
      toast({
        title: "오류",
        description: "변경 전 값과 변경 후 값이 동일합니다.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        selectedValue,
        action,
        action === "replace" ? newValue.trim() : undefined
      );
      // 폼 초기화
      setSelectedValue("");
      setAction("replace");
      setNewValue("");
      setIsFormOpen(false);
      toast({
        title: "규칙 추가 완료",
        description: "새로운 규칙이 추가되었습니다.",
      });
    } catch (error) {
      toast({
        title: "규칙 추가 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setSelectedValue("");
    setAction("replace");
    setNewValue("");
    setIsFormOpen(false);
  };

  if (!isFormOpen) {
    return (
      <Button
        onClick={() => setIsFormOpen(true)}
        disabled={isLoading || availableEesLineIds.length === 0}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        규칙 추가
      </Button>
    );
  }

  return (
    <Card className="border-primary/50">
      <CardContent className="pt-6 space-y-4">
        {/* ees_line_id 선택 */}
        <div className="space-y-2">
          <Label>ees_line_id 선택</Label>
          <Select value={selectedValue} onValueChange={setSelectedValue}>
            <SelectTrigger>
              <SelectValue placeholder="변경/삭제할 값 선택..." />
            </SelectTrigger>
            <SelectContent>
              <ScrollArea className="h-[200px]">
                {availableEesLineIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    {id}
                  </SelectItem>
                ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>

        {/* 액션 선택 */}
        {selectedValue && (
          <div className="space-y-2">
            <Label>액션 선택</Label>
            <RadioGroup
              value={action}
              onValueChange={(value) => setAction(value as "replace" | "delete")}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="replace" id="replace" />
                <Label htmlFor="replace" className="cursor-pointer">변경한다</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delete" id="delete" />
                <Label htmlFor="delete" className="cursor-pointer">삭제한다</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {/* 새 값 입력 (변경 액션일 때만) */}
        {selectedValue && action === "replace" && (
          <div className="space-y-2">
            <Label>새 값</Label>
            <Input
              placeholder="변경할 새 값을 입력하세요..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        )}

        {/* 버튼 */}
        {selectedValue && (
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className="gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              규칙 저장
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              취소
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 규칙 목록 컴포넌트
// ============================================================================

interface RuleListProps {
  rules: FabInfoRule[];
  isLoading: boolean;
  onDelete: (ruleId: number) => Promise<void>;
}

function RuleList({ rules, isLoading, onDelete }: RuleListProps) {
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (rule: FabInfoRule) => {
    setDeletingId(rule.id);
    try {
      await onDelete(rule.id);
      toast({
        title: "규칙 삭제 완료",
        description: `"${rule.target_value}" 규칙이 삭제되었습니다.`,
      });
    } catch (error) {
      toast({
        title: "규칙 삭제 실패",
        description: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
        <ListFilter className="h-8 w-8 mb-2" />
        <p>등록된 규칙이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>원본 값</TableHead>
            <TableHead className="w-20 text-center">액션</TableHead>
            <TableHead>새 값</TableHead>
            <TableHead className="w-20 text-center">관리</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule, index) => (
            <TableRow key={rule.id}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">{rule.target_value}</TableCell>
              <TableCell className="text-center">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    rule.action === "replace"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {rule.action_display}
                </span>
              </TableCell>
              <TableCell>
                {rule.action === "replace" ? (
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    {rule.new_value}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(rule)}
                  disabled={deletingId === rule.id}
                >
                  {deletingId === rule.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// 비교 테이블 컴포넌트
// ============================================================================

interface CompareTableProps {
  type: "original" | "filtered";
  title: string;
  description: string;
}

function CompareTable({ type, title, description }: CompareTableProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FabInfoFilters>({});
  const pageSize = 50;

  const { data, totalCount, totalPages, isLoading, refetch } = useFabInfoData(
    type,
    page,
    pageSize,
    filters
  );

  const handleFilterChange = (field: keyof FabInfoFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1); // 필터 변경 시 첫 페이지로
  };

  const columns = ["ppid_8", "ees_line_id", "mes_line_id", "eqp_id", "proc_model_name"] as const;

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              총 {totalCount.toLocaleString()}건
            </span>
            <Button size="sm" variant="ghost" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 필터 */}
        <div className="grid grid-cols-5 gap-2">
          {columns.map((col) => (
            <Input
              key={col}
              placeholder={col}
              value={filters[col] || ""}
              onChange={(e) => handleFilterChange(col, e.target.value)}
              className="text-xs h-8"
            />
          ))}
        </div>

        {/* 테이블 */}
        <ScrollArea className="h-[300px] border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Database className="h-8 w-8 mb-2" />
              <p>데이터가 없습니다.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col} className="text-xs whitespace-nowrap">
                      {col}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id}>
                    {columns.map((col) => (
                      <TableCell key={col} className="text-xs py-2">
                        {row[col] || "-"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </ScrollArea>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              다음
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 메인 페이지 컴포넌트
// ============================================================================

export default function FabInfoRules() {
  const { user } = useAuth();
  const {
    rules,
    availableEesLineIds,
    isLoadingRules,
    isLoadingEesLineIds,
    createRuleAsync,
    deleteRuleAsync,
  } = useFabInfoRules();

  // D2: MANAGER 권한 체크
  if (user?.auth !== "MANAGER") {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <Card className="p-8 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-600">접근 권한이 없습니다</h2>
          <p className="text-gray-500 mt-2">
            이 페이지는 MANAGER 권한이 필요합니다.
          </p>
        </Card>
      </div>
    );
  }

  const handleCreateRule = async (
    targetValue: string,
    action: "replace" | "delete",
    newValue?: string
  ) => {
    await createRuleAsync({
      target_value: targetValue,
      action,
      new_value: newValue,
    });
  };

  const handleDeleteRule = async (ruleId: number) => {
    await deleteRuleAsync(ruleId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings2 className="h-6 w-6" />
          Fab_Info 규칙 관리
        </h1>
        <p className="text-muted-foreground mt-1">
          ees_line_id 값을 변경하거나 삭제하는 규칙을 관리합니다. 규칙 변경 시 자동으로 가공 테이블이 업데이트됩니다.
        </p>
      </div>

      {/* 규칙 관리 섹션 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 좌측: 규칙 추가 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              규칙 추가
            </CardTitle>
            <CardDescription>
              새로운 변환/삭제 규칙을 추가합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RuleForm
              availableEesLineIds={availableEesLineIds}
              isLoading={isLoadingEesLineIds}
              onSubmit={handleCreateRule}
            />
            {availableEesLineIds.length === 0 && !isLoadingEesLineIds && (
              <p className="text-sm text-muted-foreground mt-4">
                모든 ees_line_id에 대해 규칙이 설정되었거나, 데이터가 없습니다.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 우측: 규칙 목록 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListFilter className="h-5 w-5" />
              현재 규칙 목록
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {rules.length}개
              </span>
            </CardTitle>
            <CardDescription>
              등록된 규칙이 순서대로 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RuleList
              rules={rules}
              isLoading={isLoadingRules}
              onDelete={handleDeleteRule}
            />
          </CardContent>
        </Card>
      </div>

      {/* 테이블 비교 섹션 */}
      <div>
        <h2 className="text-lg font-semibold mb-4">테이블 비교</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CompareTable
            type="original"
            title="원본 (fab_info)"
            description="원본 Fab_Info 테이블 데이터"
          />
          <CompareTable
            type="filtered"
            title="가공 (fab_info_filtered)"
            description="규칙이 적용된 가공 데이터"
          />
        </div>
      </div>
    </div>
  );
}
