/**
 * Fab_Info 관련 타입 정의
 */

// ============================================================================
// API 응답 타입
// ============================================================================

/** Fab_Info 규칙 */
export interface Fab_Info_Rule {
  id: number;
  target_value: string;
  action: "replace" | "delete";
  action_display: string;
  new_value: string | null;
  created_at: string;
  updated_at: string;
}

/** Fab_Info 테이블 데이터 (원본/가공 공통) */
export interface Fab_Info_Data {
  id: number;
  ppid_8: string | null;
  ees_line_id: string | null;
  mes_line_id: string | null;
  eqp_id: string | null;
  proc_model_name: string | null;
}

/** Fab_Info 페이지네이션 응답 */
export interface Fab_Info_Response {
  results: Fab_Info_Data[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

/** 규칙 적용 결과 */
export interface Apply_Rules_Result {
  success: boolean;
  original_count: number;
  filtered_count: number;
  deleted_count: number;
  replaced_count: number;
  message: string;
}

// ============================================================================
// API 요청 타입
// ============================================================================

/** 규칙 생성 요청 */
export interface Create_Rule_Payload {
  target_value: string;
  action: "replace" | "delete";
  new_value?: string;
}

/** 규칙 수정 요청 */
export interface Update_Rule_Payload {
  id: number;
  action?: "replace" | "delete";
  new_value?: string;
}

/** 테이블 필터 파라미터 */
export interface Fab_Info_Filters {
  ees_line_id?: string;
  ppid_8?: string;
  mes_line_id?: string;
  eqp_id?: string;
  proc_model_name?: string;
}

// ============================================================================
// API 에러 타입
// ============================================================================

/** API 에러 응답 */
export interface Fab_Info_Api_Error {
  error?: string;
  new_value?: string[];
  target_value?: string[];
  [key: string]: string | string[] | undefined;
}
