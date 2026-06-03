import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, type UserInfo } from '../services/authService';

interface AuthState {
  user: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>(() => {
    const { user, authenticated } = authService.restoreSession();
    return {
      user,
      isAuthenticated: authenticated,
      isLoading: !user && !!authService.getAccessToken(),
    };
  });

  const setState = useCallback((updates: Partial<AuthState>) => {
    setAuthState((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (authState.isLoading && authService.getAccessToken()) {
      const token = authService.getAccessToken();
      if (token && !authService.isTokenExpired(token)) {
        const user = authService.getUser();
        setState({ user, isAuthenticated: true, isLoading: false });
      } else if (token && authService.isTokenExpired(token)) {
        authService
          .refreshAccessToken()
          .then(() => {
            const restoredUser = authService.getUser();
            setState({ user: restoredUser, isAuthenticated: true, isLoading: false });
          })
          .catch(() => {
            setState({ user: null, isAuthenticated: false, isLoading: false });
          });
      } else {
        setState({ user: null, isAuthenticated: false, isLoading: false });
      }
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      setState({ isLoading: true });
      try {
        const result = await authService.login(email, password);
        if (result.success && result.user) {
          setState({
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }
        setState({ isLoading: false });
        return { success: false, error: result.error || '登录失败' };
      } catch (err: any) {
        setState({ isLoading: false });
        return { success: false, error: err.message || '登录异常' };
      }
    },
    [setState],
  );

  const register = useCallback(
    async (data: { email: string; password: string; name: string }): Promise<{ success: boolean; error?: string }> => {
      setState({ isLoading: true });
      try {
        const result = await authService.register(data);
        if (result.success && result.user) {
          setState({
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        }
        setState({ isLoading: false });
        return { success: false, error: result.error || '注册失败' };
      } catch (err: any) {
        setState({ isLoading: false });
        return { success: false, error: err.message || '注册异常' };
      }
    },
    [setState],
  );

  const logout = useCallback(() => {
    authService.logout();
    setState({ user: null, isAuthenticated: false, isLoading: false });
    navigate('/');
  }, [setState, navigate]);

  const requireAuth = useCallback(
    (redirectUrl = '/login') => {
      if (!authState.isAuthenticated && !authState.isLoading) {
        navigate(redirectUrl, { state: { from: window.location.pathname } });
        return false;
      }
      return authState.isAuthenticated;
    },
    [authState.isAuthenticated, authState.isLoading, navigate],
  );

  const isTrialAvailable = useCallback((): boolean => {
    const { user } = authState;
    if (!user) return false;
    if (user.trial_used || user.is_premium) return false;
    if (user.trial_ends_at) return new Date(user.trial_ends_at) > new Date();
    return false;
  }, [authState.user]);

  const isPremium = useCallback((): boolean => {
    const { user } = authState;
    if (!user) return false;
    return user.is_premium || isTrialAvailable();
  }, [authState.user, isTrialAvailable]);

  const getRemainingTrialDays = useCallback((): number => {
    const { user } = authState;
    if (!user?.trial_ends_at) return 0;
    const diffTime = new Date(user.trial_ends_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }, [authState.user]);

  return {
    ...authState,

    login,
    register,
    logout,
    requireAuth,

    isTrialAvailable: isTrialAvailable(),
    isPremium: isPremium(),
    remainingTrialDays: getRemainingTrialDays(),

    userName: authState.user?.name || '',
    userEmail: authState.user?.email || '',
    userPlan: authState.user?.plan_type || 'free',
    avatarUrl: authState.user?.avatar_url || '',

    getAccessToken: () => authService.getAccessToken(),
    refreshAuth: async () => {
      try {
        await authService.refreshAccessToken();
        const user = authService.getUser();
        setState({ user, isAuthenticated: true });
      } catch {
        logout();
      }
    },
  };
}
