/**
 * 轻量级认证工具 - 仅包含首屏需要的函数
 * Token 读取逻辑与 SoulSpark 保持一致
 */

const TOKEN_KEY = 'auth_token';

function isJwtFormat(str: string): boolean {
  return str.split('.').length === 3 && str.length > 20;
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function getToken(): string | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;

  // 直接检查是否为 JWT 格式
  if (isJwtFormat(raw)) {
    if (isTokenExpired(raw)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return raw;
  }

  // 非JWT格式，清除无效token
  localStorage.removeItem(TOKEN_KEY);
  return null;
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getPlanFromToken(): string {
  const token = getToken();
  if (!token) return 'free';
  const payload = parseJwtPayload(token);
  return payload?.plan || 'free';
}

export function getUserInfoFromToken(): any | null {
  const token = getToken();
  if (!token) return null;
  const payload = parseJwtPayload(token);
  return payload
    ? {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        plan: payload.plan,
        is_premium: payload.is_premium || payload.plan !== 'free',
      }
    : null;
}
