import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_premium: boolean;
  plan_type: 'free' | 'single' | 'bulk' | 'monthly' | 'yearly' | 'school';
  trial_started_at?: string;
  trial_ends_at?: string;
  trial_used?: boolean;
}

interface UserState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; name: string }) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  
  // Computed
  isTrialAvailable: () => boolean;
  isPremium: () => boolean;
  getRemainingTrialDays: () => number;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setLoading: (isLoading) => set({ isLoading }),

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '登录失败');
      }

      const data = await response.json();
      
      // Save token
      localStorage.setItem('auth_token', data.token);
      
      // Set user
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      });

    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (registerData) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '注册失败');
      }

      const data = await response.json();
      
      localStorage.setItem('auth_token', data.token);
      
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false
      });

    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('auth_token');
    set({
      user: null,
      isAuthenticated: false
    });
  },

  fetchUser: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        set({
          user: data.user,
          isAuthenticated: true
        });
      } else {
        // Token invalid or expired
        get().logout();
      }
    } catch (error) {
      console.error('Fetch user error:', error);
    }
  },

  updateProfile: async (profileData) => {
    const token = localStorage.getItem('auth_token');
    if (!token) throw new Error('未登录');

    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '更新失败');
    }

    const data = await response.json();
    set({ user: data.user });
  },

  isTrialAvailable: () => {
    const { user } = get();
    if (!user) return false;
    
    // 已使用过试用或已是付费用户
    if (user.trial_used || user.is_premium) return false;
    
    // 检查试用期是否已过期
    if (user.trial_ends_at) {
      return new Date(user.trial_ends_at) > new Date();
    }
    
    return false;
  },

  isPremium: () => {
    const { user } = get();
    if (!user) return false;
    
    return user.is_premium || get().isTrialAvailable();
  },

  getRemainingTrialDays: () => {
    const { user } = get();
    if (!user?.trial_ends_at) return 0;
    
    const endDate = new Date(user.trial_ends_at);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  }
}));
