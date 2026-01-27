import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { useActiveUsers } from '@/hooks/useActiveUsers';

export function ConcurrentUsersIndicator() {
  const { activeUsers, isLoading } = useActiveUsers();

  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100 transition-colors"
    >
      {/* 녹색 점멸 인디케이터 */}
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>

      {/* 사용자 아이콘 */}
      <Users className="h-3.5 w-3.5" />

      {/* 접속자 수 */}
      {isLoading ? (
        <span className="text-xs font-medium">...</span>
      ) : (
        <span className="text-xs font-medium">{activeUsers}명 접속 중</span>
      )}
    </Badge>
  );
}
