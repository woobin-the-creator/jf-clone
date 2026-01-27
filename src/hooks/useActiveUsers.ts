import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

const HEARTBEAT_INTERVAL = 30000; // 30초

interface ActiveUsersResponse {
  active_users: number;
  timestamp: string;
}

export function useActiveUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Heartbeat mutation
  const heartbeatMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          user_id: user?.mail_knox || `anonymous_${Date.now()}`,
          username: user?.username || 'Unknown'
        })
      });
      if (!response.ok) {
        throw new Error('Heartbeat failed');
      }
      return response.json() as Promise<ActiveUsersResponse>;
    },
    onSuccess: (data) => {
      // Heartbeat 응답으로 active_users 캐시 업데이트
      queryClient.setQueryData(['/api/active-users'], data);
    }
  });

  // 활성 사용자 수 조회
  const { data, isLoading } = useQuery<ActiveUsersResponse>({
    queryKey: ['/api/active-users'],
    queryFn: async () => {
      const response = await fetch('/api/active-users', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch active users');
      }
      return response.json();
    },
    refetchInterval: HEARTBEAT_INTERVAL,
    staleTime: HEARTBEAT_INTERVAL - 5000, // 25초
  });

  // Heartbeat 전송 함수
  const sendHeartbeat = useCallback(() => {
    if (user) {
      heartbeatMutation.mutate();
    }
  }, [user, heartbeatMutation]);

  // 주기적 heartbeat 전송
  useEffect(() => {
    if (!user) return;

    // 초기 heartbeat 전송
    sendHeartbeat();

    // 주기적 heartbeat
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // 페이지 포커스 시 heartbeat
    const handleFocus = () => sendHeartbeat();
    window.addEventListener('focus', handleFocus);

    // cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, sendHeartbeat]);

  return {
    activeUsers: data?.active_users ?? 0,
    isLoading,
    lastUpdated: data?.timestamp
  };
}
