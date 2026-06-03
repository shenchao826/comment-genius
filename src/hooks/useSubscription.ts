import { useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { paymentService } from '../services/paymentService';

export interface SubscriptionStatus {
  isActive: boolean;
  planType: string;
  endDate?: string;
  startDate?: string;
  autoRenew: boolean;
  trialUsed: boolean;
  trialEndDate?: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    isActive: false,
    planType: 'free',
    autoRenew: false,
    trialUsed: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const user = authService.getUser();
      if (!user || !authService.isAuthenticated()) {
        setSubscription({
          isActive: false,
          planType: 'free',
          autoRenew: false,
          trialUsed: false,
        });
        return;
      }

      const isPremium = user.is_premium || false;
      const planType = user.plan_type || 'free';

      setSubscription({
        isActive: isPremium,
        planType,
        endDate: user.trial_ends_at,
        startDate: user.trial_started_at,
        autoRenew: ['monthly', 'yearly'].includes(planType),
        trialUsed: !!user.trial_used,
        trialEndDate: user.trial_ends_at,
      });
    } catch (err: any) {
      setError(err.message || '获取订阅状态失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const createOrder = useCallback(async (planId: string) => {
    const result = await paymentService.createOrder(planId);
    if (!result.success) {
      throw new Error(result.error || '创建订单失败');
    }
    return result.order;
  }, []);

  const isPremium = subscription.isActive && ['monthly', 'yearly', 'school', 'premium', 'bulk_class'].includes(subscription.planType);
  const isInTrial = !subscription.trialUsed && subscription.trialEndDate && new Date(subscription.trialEndDate) > new Date();
  const daysUntilExpiry = subscription.endDate
    ? Math.max(0, Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return {
    subscription,
    isLoading,
    error,

    isPremium,
    isInTrial,
    daysUntilExpiry,

    fetchSubscriptionStatus,
    createOrder,

    refetch: () => {
      const user = authService.getUser();
      if (user) {
        setSubscription((prev) => ({
          ...prev,
          isActive: user.is_premium || false,
          planType: user.plan_type || 'free',
          endDate: user.trial_ends_at,
          trialUsed: !!user.trial_used,
          trialEndDate: user.trial_ends_at,
        }));
      }
    },
  };
}
