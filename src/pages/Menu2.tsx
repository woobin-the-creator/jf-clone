import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Send, User, Mail, Building, FileText, Upload, ClipboardPaste, X, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import ExcelClipboardBox from "@/components/menu2/excel_clipboard_box";
import { extractPartIdsFromExcelHtml } from "@/components/menu2/extractPartIdsFromExcelHtml";
import CreateTableButton from "@/components/menu2/Create_Table_Button";
import ExcelTemplateLinkButton from "@/components/menu2/ExcelTemplateLinkButton";
import NotifyMemberSelector, { type CalendarMember } from "@/components/menu2/NotifyMemberSelector";
import { useDraftAutosave } from "@/hooks/useDraftAutosave";

interface FormData {
  title: string;
  content: string;
}

// 임시저장(localStorage)에 담는 폼 데이터 — JSON 직렬화 가능한 값만 포함
interface Menu2Draft {
  title: string;
  content: string;
  excelHtml: string;
  excelHtml2: string;
  notifyMembers: CalendarMember[];
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DRAFT_KEY = "menu2:draft";

export default function Menu2() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    content: "",
  });

  // 표 1 (변경 전 / 변경 후)
  const [excelHtml, setExcelHtml] = useState<string>("");
  const [partIds, setPartIds] = useState<string[]>([]);

  // 표 2 (추가 정보)
  const [excelHtml2, setExcelHtml2] = useState<string>("");

  // 알림 대상자
  const [notifyMembers, setNotifyMembers] = useState<CalendarMember[]>([]);

  // ==================== 임시저장 (자동 저장) ====================
  // 복원 배너를 닫았는지 여부 (불러오기/새로 작성 선택 시 true)
  const [restorePromptDismissed, setRestorePromptDismissed] = useState(false);

  // 자동 저장 대상 데이터 (불필요한 재저장 방지를 위해 memo)
  const draftData = useMemo<Menu2Draft>(
    () => ({
      title: formData.title,
      content: formData.content,
      excelHtml,
      excelHtml2,
      notifyMembers,
    }),
    [formData.title, formData.content, excelHtml, excelHtml2, notifyMembers],
  );

  const { restoredDraft, lastSavedAt, status, clearDraft, discardRestored } =
    useDraftAutosave<Menu2Draft>({
      key: DRAFT_KEY,
      data: draftData,
      delay: 2000,
      // 아무것도 입력하지 않은 빈 폼은 저장하지 않음
      isEmpty: (d) =>
        !d.title.trim() &&
        !d.content.trim() &&
        !d.excelHtml &&
        !d.excelHtml2 &&
        d.notifyMembers.length === 0,
    });

  const showRestorePrompt = !!restoredDraft && !restorePromptDismissed;

  const savedTimeLabel = lastSavedAt
    ? lastSavedAt.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : "";
  const restoreSavedLabel = lastSavedAt
    ? lastSavedAt.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" })
    : "";

  // 임시저장 내용으로 폼 복원
  const handleRestoreDraft = () => {
    if (!restoredDraft) return;
    setFormData({ title: restoredDraft.title, content: restoredDraft.content });
    setExcelHtml(restoredDraft.excelHtml);
    setPartIds(extractPartIdsFromExcelHtml(restoredDraft.excelHtml));
    setExcelHtml2(restoredDraft.excelHtml2);
    setNotifyMembers(restoredDraft.notifyMembers);
    setRestorePromptDismissed(true);
  };

  // 임시저장 버리고 새로 작성
  const handleDiscardDraft = () => {
    discardRestored();
    setRestorePromptDismissed(true);
  };

  const submitMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest("/api/request-submissions", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast({ title: "상신 완료", description: "변경 의뢰가 정상적으로 상신되었습니다." });
      // 초기화
      setFormData({ title: "", content: "" });
      setExcelHtml("");
      setExcelHtml2("");
      setPartIds([]);
      setNotifyMembers([]);
      // 상신 성공 시 임시저장 제거
      clearDraft();
    },
    onError: () => {
      toast({ title: "상신 실패", description: "오류가 발생했습니다. 다시 시도해주세요.", variant: "destructive" });
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({ title: "제목을 입력해주세요", variant: "destructive" });
      return;
    }
    const payload = {
      title: formData.title,
      content: formData.content,
      part: user?.part ?? "",
      submitted_by: user?.username ?? "",
      mail_knox: user?.mail_knox ?? "",
      change_request_items: excelHtml,
      additional_info: excelHtml2,
      notify_members: notifyMembers.map((m) => m.knox_id),
    };
    submitMutation.mutate(payload);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            변경 의뢰 상신
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* 임시저장 복원 배너 */}
          {showRestorePrompt && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-sm text-amber-800">
                이전에 작성하던 임시저장 내용이 있습니다
                {restoreSavedLabel && <span className="text-amber-600"> ({restoreSavedLabel} 저장)</span>}.
              </div>
              <div className="flex gap-2 shrink-0">
                <Button type="button" variant="outline" size="sm" onClick={handleDiscardDraft}>
                  새로 작성
                </Button>
                <Button type="button" size="sm" onClick={handleRestoreDraft}>
                  불러오기
                </Button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 상신자 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">{user?.username}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">{user?.part}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-slate-500" />
                <span className="text-sm text-slate-600">{user?.mail_knox}</span>
              </div>
            </div>

            {/* 제목 */}
            <div className="space-y-2">
              <Label htmlFor="title">의뢰 제목 <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="변경 의뢰 제목을 입력하세요"
              />
            </div>

            {/* 내용 */}
            <div className="space-y-2">
              <Label htmlFor="content">의뢰 내용</Label>
              <Textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="변경 의뢰 내용을 입력하세요"
                rows={6}
              />
            </div>

            {/* 표 1: 변경 항목 */}
            <div className="space-y-2">
              <Label>변경 의뢰 항목</Label>
              <ExcelClipboardBox
                value={excelHtml}
                onChange={(html) => {
                  setExcelHtml(html);
                  setPartIds(extractPartIdsFromExcelHtml(html));
                }}
              />
              {partIds.length > 0 && (
                <p className="text-xs text-slate-500">추출된 Part ID: {partIds.length}개</p>
              )}
            </div>

            {/* 표 2: 추가 정보 */}
            <div className="space-y-2">
              <Label>추가 정보</Label>
              <ExcelClipboardBox value={excelHtml2} onChange={setExcelHtml2} />
            </div>

            {/* 알림 대상자 */}
            <div className="space-y-2">
              <Label>알림 대상자</Label>
              <NotifyMemberSelector selected={notifyMembers} onChange={setNotifyMembers} />
            </div>

            {/* 버튼 */}
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-slate-400" aria-live="polite">
                {status === "saving" && "임시저장 중…"}
                {status === "saved" && savedTimeLabel && `임시저장됨 ${savedTimeLabel}`}
              </div>
              <div className="flex gap-2">
                <ExcelTemplateLinkButton />
                <CreateTableButton partIds={partIds} />
                <Button type="submit" disabled={submitMutation.isPending}>
                  <Send className="h-4 w-4 mr-2" />
                  {submitMutation.isPending ? "상신 중..." : "상신하기"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
