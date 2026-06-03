import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '@/services/authService';

describe('AuthService', () => {
  beforeEach(() => {
    authService.clearAll();
    localStorage.clear();
    (authService as any).initialized = false;
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('JWT parsing', () => {
    it('should parse valid JWT payload', () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const payload = btoa(
        JSON.stringify({
          sub: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      );
      const token = `${header}.${payload}.signature`;

      const parsed = authService.parseJwt(token);
      expect(parsed?.sub).toBe('user-123');
      expect(parsed?.email).toBe('test@example.com');
      expect(parsed?.name).toBe('Test User');
    });

    it('should return null for invalid JWT', () => {
      expect(authService.parseJwt('not-a-jwt')).toBeNull();
      expect(authService.parseJwt('a.b')).toBeNull();
    });
  });

  describe('token management', () => {
    it('should store and retrieve access token', () => {
      authService.setTokens({ access: 'test-token-123', expiresIn: 3600 });
      expect(authService.getAccessToken()).toBe('test-token-123');
    });

    it('should check token expiration correctly', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const pastExp = Math.floor(Date.now() / 1000) - 3600;

      const header = btoa('{}');
      const futurePayload = btoa(JSON.stringify({ exp: futureExp }));
      const pastPayload = btoa(JSON.stringify({ exp: pastExp }));

      expect(authService.isTokenExpired(`${header}.${futurePayload}.sig`)).toBe(false);
      expect(authService.isTokenExpired(`${header}.${pastPayload}.sig`, 0)).toBe(true);
    });

    it('should clear all state on logout', () => {
      authService.setTokens({ access: 'token', expiresIn: 3600 });
      authService.setUser({ id: '1', email: 'a@b.com', name: 'Test', is_premium: false, plan_type: 'free' } as any);

      authService.logout();
      expect(authService.getAccessToken()).toBeNull();
      expect(authService.getUser()).toBeNull();
    });
  });

  describe('session restore', () => {
    it('should restore session from localStorage', () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      const payload = btoa(JSON.stringify({ sub: '1', email: 'a@b.com', name: 'Restored', exp: futureExp }));
      const header = btoa('{"alg":"HS256","typ":"JWT"}');
      const validToken = `${header}.${payload}.sig`;

      localStorage.setItem('auth_token', validToken);
      localStorage.setItem('auth_user', JSON.stringify({ id: '1', email: 'a@b.com', name: 'Restored' }));

      const result = authService.restoreSession();
      expect(result.authenticated).toBe(true);
      expect(result.user?.name).toBe('Restored');
    });

    it('should return unauthenticated for expired token in storage', () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      const header = btoa('{}');
      const payload = btoa(JSON.stringify({ exp: pastExp }));
      localStorage.setItem('auth_token', `${header}.${payload}.sig`);

      const result = authService.restoreSession();
      expect(result.authenticated).toBe(false);
    });
  });
});
