const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const USER_KEY = 'auth_user';

export interface AuthTokens {
  access: string;
  refresh?: string;
  expiresIn: number;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name?: string;
  iat: number;
  exp: number;
  plan_type?: string;
  is_premium?: boolean;
}

export interface UserInfo {
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

export interface LoginResult {
  success: boolean;
  user?: UserInfo;
  error?: string;
}

class AuthService {
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private tokenRefreshPromise: Promise<string> | null = null;

  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(TOKEN_KEY, tokens.access);
    if (tokens.refresh) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh);
    }
    this.scheduleTokenRefresh(tokens.expiresIn);
  }

  setUser(user: UserInfo): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {}
  }

  getUser(): UserInfo | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  parseJwt(token: string): JwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  getTokenRemainingTime(token?: string): number {
    const t = token || this.getAccessToken();
    if (!t) return 0;

    const payload = this.parseJwt(t);
    if (!payload?.exp) return 0;

    return Math.max(0, payload.exp * 1000 - Date.now());
  }

  isTokenExpired(token?: string, bufferMs = 30000): boolean {
    return this.getTokenRemainingTime(token) <= bufferMs;
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  scheduleTokenRefresh(expiresInSeconds: number): void {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    const refreshDelay = Math.max(60_000, (expiresInSeconds - 120) * 1000);
    this.refreshTimer = setTimeout(() => {
      this.refreshAccessToken().catch(console.error);
    }, refreshDelay);
  }

  async refreshAccessToken(): Promise<string> {
    if (this.tokenRefreshPromise) return this.tokenRefreshPromise;

    this.tokenRefreshPromise = this.doRefreshToken();
    try {
      return await this.tokenRefreshPromise;
    } finally {
      this.tokenRefreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');

    const apiBase = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiBase}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      this.clearAll();
      throw new Error('Session expired, please login again');
    }

    const data = await response.json();
    this.setTokens({
      access: data.access_token || data.token,
      refresh: data.refresh_token,
      expiresIn: data.expires_in || 3600,
    });

    if (data.user) this.setUser(data.user);
    return data.access_token || data.token;
  }

  async login(email: string, password: string): Promise<LoginResult> {
    const apiBase = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.message || data.error || '登录失败' };
      }

      const accessToken = data.access_token || data.token;
      const payload = this.parseJwt(accessToken);

      this.setTokens({
        access: accessToken,
        refresh: data.refresh_token,
        expiresIn: payload?.exp ? Math.floor((payload.exp - Date.now() / 1000)) : 3600,
      });

      if (data.user) this.setUser(data.user);
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || '网络异常，请稍后重试' };
    }
  }

  async register(data: { email: string; password: string; name: string }): Promise<LoginResult> {
    const apiBase = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
    try {
      const response = await fetch(`${apiBase}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const regData = await response.json();

      if (!response.ok) {
        return { success: false, error: regData.message || regData.error || '注册失败' };
      }

      const accessToken = regData.access_token || regData.token;
      const payload = this.parseJwt(accessToken);

      this.setTokens({
        access: accessToken,
        refresh: regData.refresh_token,
        expiresIn: payload?.exp ? Math.floor((payload.exp - Date.now() / 1000)) : 3600,
      });

      if (regData.user) this.setUser(regData.user);
      return { success: true, user: regData.user };
    } catch (err: any) {
      return { success: false, error: err.message || '网络异常，请稍后重试' };
    }
  }

  logout(): void {
    this.clearAll();

    const apiBase = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
    fetch(`${apiBase}/api/auth/logout`, { method: 'POST' }).catch(() => {});
  }

  clearAll(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.tokenRefreshPromise = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.getAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async ensureValidToken(): Promise<string | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    if (!this.isTokenExpired(token)) return token;

    try {
      return await this.refreshAccessToken();
    } catch {
      return null;
    }
  }

  restoreSession(): { user: UserInfo | null; authenticated: boolean } {
    const user = this.getUser();
    const authenticated = this.isAuthenticated();
    if (!authenticated && this.getAccessToken()) {
      this.clearAll();
      return { user: null, authenticated: false };
    }
    if (authenticated && user) {
      const remaining = this.getTokenRemainingTime();
      if (remaining > 0) {
        this.scheduleTokenRefresh(remaining / 1000);
      }
    }
    return { user, authenticated };
  }
}

export const authService = new AuthService();
