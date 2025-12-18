import { type ColumnFilter } from "@/components/menu1/ColumnHeader";

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
}

export interface RequestSubmissionResponse {
  results: RequestSubmission[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Calendar {
  name: string;
  employee_number: string;
  part: string;
  knox_id: string;
}

export interface FilterState {
  searchTerm: string;
  dateFilter: {
    from: Date | undefined;
    to: Date | undefined;
  };
  columnFilters: ColumnFilter[];
}
