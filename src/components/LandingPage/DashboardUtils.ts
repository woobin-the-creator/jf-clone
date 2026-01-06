// client/src/components/LandingPage/DashboardUtils.ts

import { RequestSubmission } from "@shared/schema";

// mail_knox에서 username 추출 함수 (예: "john@example.com" -> "john")
export const extractUsernameFromEmail = (email: string | undefined): string => {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  return atIndex > 0 ? email.substring(0, atIndex) : email;
};

// 내 의뢰인지 판별하는 함수
export const isMySubmission = (
  submission: RequestSubmission,
  currentUsername: string | undefined
): boolean => {
  if (!currentUsername) return false;

  // 조건 1: submission.mail_knox의 username이 현재 사용자 username과 일치
  const submissionUsername = extractUsernameFromEmail(submission.mail_knox);
  const isCreator = submissionUsername === currentUsername;

  // 조건 2: submission.assignee에 현재 사용자 username이 포함됨
  const assigneeList = submission.assignee?.split(',').map(a => a.trim()) || [];
  const isAssignee = assigneeList.includes(currentUsername);

  return isCreator || isAssignee;
};

// created_at 포맷 변환 함수 (yyyy-mm-dd hh:mm:ss.sssss -> mm-dd hh:mm)
export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
};

// updated_at 포맷 변환 함수 (yyyy-mm-dd hh:mm:ss.sssss -> yyyy-mm-dd hh:mm)
export const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 오늘 날짜인지 확인하는 함수
export const isToday = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

// 선택된 status의 submission 필터링 (수정됨: isMySubmission 사용)
export const getFilteredSubmissions = (
  submissions: RequestSubmission[] | undefined,
  status: string,
  currentUsername: string | undefined
) => {
  if (!submissions || !currentUsername) return [];

  return submissions.filter(
    (submission) =>
      submission.status === status &&
      isMySubmission(submission, currentUsername)
  );
};

// 오늘 업데이트된 submission 필터링 (수정됨: isMySubmission 사용)
export const getTodayUpdatedSubmissions = (
  submissions: RequestSubmission[] | undefined,
  currentUsername: string | undefined
) => {
  if (!submissions || !currentUsername) return [];

  return submissions.filter(
    (submission) =>
      isMySubmission(submission, currentUsername) &&
      isToday(submission.updated_at)
  );
};
