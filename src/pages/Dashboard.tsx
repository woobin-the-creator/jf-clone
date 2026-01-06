import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RequestSubmission } from "@shared/schema";
import WhatsNewSection from "@/components/LandingPage/Whatsnewsection";
import StatusCard, { StatusGrid, statusConfig } from "@/components/LandingPage/StatusCard";
import { getFilteredSubmissions, getTodayUpdatedSubmissions, isMySubmission } from "@/components/LandingPage/DashboardUtils";
import { Users, User } from "lucide-react";

interface ApiResponse {
  results: RequestSubmission[];
  count: number;
}

export default function Dashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showAllSubmissions, setShowAllSubmissions] = useState(true);
  const { user } = useAuth();

  const { data: submissionsData, isLoading } = useQuery<ApiResponse>({
    queryKey: ['/api/request-submissions'],
    queryFn: async () => {
      const response = await fetch('/api/request-submissions?page=1&page_size=1000', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.');
      }
      return response.json();
    },
  });

  // 표시할 의뢰 목록 결정 (전체 or 내 의뢰)
  const displaySubmissions = showAllSubmissions
    ? (submissionsData?.results || [])
    : (submissionsData?.results.filter(
        (submission) => isMySubmission(submission, user?.username)
      ) || []);

  // 상태별 통계 계산
  const statusStats = displaySubmissions.reduce((acc, submission) => {
    const status = submission.status || '내부결재대기중';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 오늘 업데이트된 submissions (필터 적용)
  const todayUpdatedSubmissions = showAllSubmissions
    ? (submissionsData?.results.filter((submission) => {
        const date = new Date(submission.updated_at);
        const today = new Date();
        return (
          date.getFullYear() === today.getFullYear() &&
          date.getMonth() === today.getMonth() &&
          date.getDate() === today.getDate()
        );
      }) || [])
    : getTodayUpdatedSubmissions(
        submissionsData?.results,
        user?.username
      );

  const handleCardClick = (status: string) => {
    setSelectedStatus(selectedStatus === status ? null : status);
  };

  // 펼쳤을 때 표시할 리스트 (showAllSubmissions 상태에 따라)
  const getFilteredSubmissionsForCard = (status: string) => {
    if (showAllSubmissions) {
      // 전체 의뢰 모드: 상태만 필터링
      return submissionsData?.results.filter(
        (submission) => submission.status === status
      ) || [];
    } else {
      // 내 의뢰 모드: 기존 로직 사용
      return getFilteredSubmissions(
        submissionsData?.results,
        status,
        user?.username
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 relative">
      {/* 배경 패턴 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23C7A2FE%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%2230%22%20cy%3D%2230%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-40"></div>

      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">대시보드</h1>
        </div>

        {/* 전체/내 의뢰 토글 버튼 */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 p-1 rounded-xl bg-white/80 backdrop-blur-sm border border-indigo-200/50 shadow-sm">
            {/* 전체 의뢰 버튼 */}
            <button
              onClick={() => setShowAllSubmissions(true)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium transition-all duration-200
                ${showAllSubmissions
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <Users className="h-4 w-4" />
              전체 의뢰
            </button>

            {/* 내 의뢰 버튼 */}
            <button
              onClick={() => setShowAllSubmissions(false)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg
                text-sm font-medium transition-all duration-200
                ${!showAllSubmissions
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              <User className="h-4 w-4" />
              내 의뢰만
            </button>
          </div>

          {/* 현재 모드 표시 */}
          <p className="mt-2 text-xs text-gray-500 ml-1">
            {showAllSubmissions
              ? '모든 사용자의 의뢰를 표시하고 있습니다'
              : '내가 작성한 의뢰만 표시하고 있습니다'
            }
          </p>
        </div>

        {/* What's new? 섹션 */}
        <WhatsNewSection
          submissions={todayUpdatedSubmissions}
          isLoading={isLoading}
        />

        {/* 카드 컴포넌트들 */}
        <StatusGrid>
          {statusConfig.map((config) => (
            <StatusCard
              key={config.key}
              config={config}
              count={statusStats[config.key] || 0}
              isLoading={isLoading}
              isExpanded={selectedStatus === config.key}
              filteredSubmissions={getFilteredSubmissionsForCard(config.key)}
              onClick={() => handleCardClick(config.key)}
            />
          ))}
        </StatusGrid>
      </main>
    </div>
  );
}
