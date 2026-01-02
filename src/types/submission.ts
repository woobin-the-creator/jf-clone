// RequestSubmission 타입 정의
export interface RequestSubmission {
  id: number;
  department: string;
  title: string;
  content: string;
  submitted_by: string;
  submitted_at: string;
  line_id?: string;
  ppid?: string;
  eqpid?: string;
  change_request_items?: string;
  status?: string;
  Max_TAT?: number;
  assignee_internal?: string;
  assignee?: string;

  // Timeline 관련 필드
  status_knox?: number;
  appr_id?: string;
  mail_knox?: string;
  part?: string;

  // 시간 필드
  internal_approved_at?: string;
  assigned_at?: string;
  approved_at?: string;
  rejected_at?: string;
  canceled_at?: string;
  created_at?: string;
  updated_at?: string;

  // 코멘트 필드
  comment_assign?: string;
  comment_approve?: string;
  comment_reject?: string;
  comment_cancel?: string;

  // 담당자 필드
  assigned_by?: string;
  approved_by?: string;
  rejected_by?: string;
}
