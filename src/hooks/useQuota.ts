import { useState, useEffect, useCallback } from 'react';

interface QuotaInfo {
  used: number;
  limit: number;
  remaining: number;
  resetTime: Date;
  isPremium: boolean;
}

export function useQuota() {
  const [quota, setQuota] = useState<QuotaInfo>({
    used: 0,
    limit: 5,
    remaining: 5,
    resetTime: new Date(new Date().setHours(24, 0, 0, 0)),
    isPremium: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      
      // 如果未登录，使用默认游客配额
      if (!token) {
        setQuota({
          used: 0,
          limit: 3,
          remaining: 3,
          resetTime: new Date(new Date().setHours(24, 0, 0, 0)),
          isPremium: false
        });
        return;
      }

      const response = await fetch('/api/quota', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setQuota({
          used: data.used || 0,
          limit: data.limit || (data.is_premium ? 99999 : 5),
          remaining: data.remaining || (data.limit - data.used) || 0,
          resetTime: new Date(data.reset_time || new Date().setHours(24, 0, 0, 0)),
          isPremium: data.is_premium || false
        });
      } else {
        // 使用默认值
        setQuota(prev => ({ ...prev }));
      }

    } catch (err: any) {
      setError(err.message || '获取额度信息失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuota();

    // 每分钟刷新一次额度（可选）
    const interval = setInterval(fetchQuota, 60000);
    return () => clearInterval(interval);
  }, [fetchQuota]);

  const decrementQuota = useCallback(() => {
    setQuota(prev => ({
      ...prev,
      used: prev.used + 1,
      remaining: Math.max(0, prev.remaining - 1)
    }));
  }, []);

  return {
    quota,
    isLoading,
    error,
    refetch: fetchQuota,
    decrementQuota
  };
}
