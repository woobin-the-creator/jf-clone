import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useDraftAutosave
 * ----------------
 * 폼 입력을 localStorage에 자동 저장(임시저장)하고, 재방문 시 복원할 수 있게 하는
 * 폼 구조와 무관한(generic) 재사용 훅입니다.
 *
 * - `data`가 바뀌면 `delay`(debounce) 뒤에 자동으로 localStorage에 저장됩니다.
 * - 마운트 시 기존 임시저장이 있으면 `restoredDraft`로 돌려줍니다. (복원 여부는 호출부가 결정)
 * - 상신/제출이 성공하면 `clearDraft()`를 호출해 임시저장을 비웁니다.
 *
 * 주의: `data`는 JSON 직렬화 가능한 값이어야 합니다.
 *       (File/Blob 등 직렬화 불가 값은 호출부에서 제외하고 넘겨주세요.)
 */

// ==================== TYPES ====================

export type DraftStatus = "idle" | "saving" | "saved";

/** localStorage에 실제로 저장되는 형태 (메타데이터 포함) */
interface StoredDraft<T> {
  version: number;
  savedAt: string; // ISO 8601
  data: T;
}

export interface UseDraftAutosaveOptions<T> {
  /** localStorage 키 — 폼마다 고유해야 함 (예: "menu2:draft") */
  key: string;
  /** 현재 폼 데이터. 이 값이 바뀌면 debounce 후 자동 저장됩니다. */
  data: T;
  /** 자동 저장 활성화 여부 (기본 true). false면 저장하지 않습니다. */
  enabled?: boolean;
  /** debounce 지연(ms). 입력이 멈춘 뒤 이 시간만큼 지나면 저장. 기본 2000ms */
  delay?: number;
  /** 저장 스키마 버전 (기본 1). 폼 구조가 바뀌면 올려서 이전 임시저장을 무효화합니다. */
  version?: number;
  /**
   * "빈 폼" 판별 함수. true를 반환하면 저장하지 않고, 이미 저장된 임시저장도 삭제합니다.
   * (사용자가 내용을 모두 지웠을 때 빈 임시저장이 남지 않도록)
   */
  isEmpty?: (data: T) => boolean;
}

export interface UseDraftAutosaveResult<T> {
  /** 마운트 시 발견된 기존 임시저장 (없으면 null). 폼 복원에 사용. */
  restoredDraft: T | null;
  /** 마지막 저장 시각 (없으면 null) */
  lastSavedAt: Date | null;
  /** 현재 저장 상태 — UI 피드백("저장 중…", "저장됨")용 */
  status: DraftStatus;
  /** 지금 즉시 저장 (debounce 무시) */
  saveNow: () => void;
  /** 임시저장 삭제 — 상신/제출이 성공한 뒤 호출하세요. */
  clearDraft: () => void;
  /** 복원 대상에서 제외 — 기존 임시저장을 사용하지 않고 폐기합니다. */
  discardRestored: () => void;
}

// ==================== STORAGE HELPERS ====================

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

function readDraft<T>(key: string, version: number): StoredDraft<T> | null {
  if (!isStorageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    // 버전이 다르면 (폼 구조 변경 등) 무효 처리
    if (!parsed || parsed.version !== version) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, draft: StoredDraft<T>): boolean {
  if (!isStorageAvailable()) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
    return true;
  } catch {
    // 용량 초과 / 사생활 보호 모드 등에서 실패할 수 있음
    return false;
  }
}

function removeDraft(key: string): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

// ==================== HOOK ====================

export function useDraftAutosave<T>({
  key,
  data,
  enabled = true,
  delay = 2000,
  version = 1,
  isEmpty,
}: UseDraftAutosaveOptions<T>): UseDraftAutosaveResult<T> {
  const [restoredDraft, setRestoredDraft] = useState<T | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [status, setStatus] = useState<DraftStatus>("idle");

  // 최신 data를 ref로 유지 (flush / 이벤트 핸들러에서 stale 값 방지)
  const dataRef = useRef(data);
  dataRef.current = data;

  const timerRef = useRef<number | null>(null);
  const isFirstRunRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 실제 저장 로직을 ref에 담아 항상 최신 옵션을 참조 (이펙트 불필요한 재실행 방지)
  const persistRef = useRef<() => void>(() => {});
  persistRef.current = () => {
    const current = dataRef.current;

    // 빈 폼이면 저장하지 않고 기존 임시저장 제거
    if (isEmpty?.(current)) {
      removeDraft(key);
      setLastSavedAt(null);
      setStatus("idle");
      return;
    }

    const draft: StoredDraft<T> = {
      version,
      savedAt: new Date().toISOString(),
      data: current,
    };

    if (writeDraft(key, draft)) {
      setLastSavedAt(new Date(draft.savedAt));
      setStatus("saved");
    } else {
      setStatus("idle");
    }
  };

  // ==================== 마운트 시 기존 임시저장 복원 ====================
  useEffect(() => {
    const existing = readDraft<T>(key, version);
    if (existing) {
      setRestoredDraft(existing.data);
      setLastSavedAt(new Date(existing.savedAt));
    } else {
      setRestoredDraft(null);
    }
  }, [key, version]);

  // ==================== data 변경 시 debounce 자동 저장 ====================
  useEffect(() => {
    // 첫 렌더(마운트)는 건너뜀 — 복원/초기값을 즉시 다시 쓰지 않기 위해
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }
    if (!enabled) return;

    setStatus("saving");
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      persistRef.current();
      timerRef.current = null;
    }, delay);

    return clearTimer;
  }, [data, enabled, delay, clearTimer]);

  // ==================== 탭 숨김 / 페이지 이탈 / 언마운트 시 대기 중 저장 flush ====================
  useEffect(() => {
    if (typeof window === "undefined") return;

    // debounce 대기 중인 저장이 있으면 즉시 반영
    const flush = () => {
      if (timerRef.current) {
        clearTimer();
        persistRef.current();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", flush);
      flush(); // 언마운트 시에도 대기 중 저장 반영
    };
  }, [clearTimer]);

  // ==================== 외부 제어 함수 ====================
  const saveNow = useCallback(() => {
    clearTimer();
    persistRef.current();
  }, [clearTimer]);

  const clearDraft = useCallback(() => {
    clearTimer();
    removeDraft(key);
    setRestoredDraft(null);
    setLastSavedAt(null);
    setStatus("idle");
  }, [key, clearTimer]);

  const discardRestored = useCallback(() => {
    removeDraft(key);
    setRestoredDraft(null);
    setLastSavedAt(null);
    setStatus("idle");
  }, [key]);

  return {
    restoredDraft,
    lastSavedAt,
    status,
    saveNow,
    clearDraft,
    discardRestored,
  };
}
