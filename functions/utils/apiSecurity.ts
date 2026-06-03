import { json } from '../../utils/response';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60 * 1000, maxRequests: 60 },
  auth: { windowMs: 60 * 1000, maxRequests: 10 },
  sensitive: { windowMs: 60 * 1000, maxRequests: 20 },
  ocr: { windowMs: 60 * 1000, maxRequests: 5 },
};

function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  const path = new URL(request.url).pathname;
  return `${ip}:${path}`;
}

export function checkRateLimit(
  request: Request,
  category: string = 'default'
): { allowed: boolean; remaining: number; resetTime: number } {
  const config = RATE_LIMIT_CONFIGS[category] || RATE_LIMIT_CONFIGS.default;
  const key = getRateLimitKey(request);
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    entry = { count: 1, resetTime: now + config.windowMs };
    rateLimitStore.set(key, entry);

    setTimeout(() => rateLimitStore.delete(key), config.windowMs + 1000);

    return { allowed: true, remaining: config.maxRequests - 1, resetTime: entry.resetTime };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

export async function withRateLimit(
  request: Request,
  env: Env,
  handler: () => Promise<Response>,
  category: string = 'default'
): Promise<Response> {
  const result = checkRateLimit(request, category);

  if (!result.allowed) {
    return json(
      { error: '请求过于频繁，请稍后重试', retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000) },
      429
    );
  }

  const response = await handler();

  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_CONFIGS[category]?.maxRequests || 60));
  newResponse.headers.set('X-RateLimit-Remaining', String(result.remaining));
  newResponse.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));

  return newResponse;
}

const ALLOWED_ORIGINS = [
  'https://teachers.minicode.cloud',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  
  if (!origin) return false;

  return ALLOWED_ORIGINS.includes(origin);
}

export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  const origin = response.headers.get('Access-Control-Allow-Origin') || '*';
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');

  return new Response(response.body, { ...response, headers });
}

export function handleCorsPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;

  const origin = request.headers.get('origin');

  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export interface SecurityContext {
  isAuthenticated: boolean;
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function extractSecurityContext(request: Request): Promise<SecurityContext> {
  const context: SecurityContext = {
    isAuthenticated: false,
  };

  const authHeader = request.headers.get('Authorization');

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const payload = JSON.parse(atob(token.split('.')[1]));

      if (payload?.userId && payload.exp > Date.now() / 1000) {
        context.isAuthenticated = true;
        context.userId = payload.userId;
        context.userRole = payload.role;
      }
    } catch {
      // Invalid token
    }
  }

  const forwarded = request.headers.get('x-forwarded-for');
  context.ipAddress = forwarded?.split(',')[0]?.trim();
  context.userAgent = request.headers.get('user-agent') || undefined;

  return context;
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const sanitized: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'string') {
      sanitized[key as keyof T] = value.replace(/[<>]/g, '').trim() as T[keyof T];
    } else if (typeof value === 'number' && !isNaN(value)) {
      sanitized[key as keyof T] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key as keyof T] = value;
    } else if (Array.isArray(value)) {
      sanitized[key as keyof T] = value.map(item =>
        typeof item === 'string' ? item.replace(/[<>]/g, '').trim() : item
      ) as T[keyof T];
    }
  }

  return sanitized;
}

export function validateRequiredFields(data: Record<string, unknown>, requiredFields: string[]): {
  valid: boolean;
  missingFields: string[];
} {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
