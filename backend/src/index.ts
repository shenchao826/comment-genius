/**
 * ⚠️ DEPRECATED: 此 Hono Worker 后端已废弃
 *
 * 主要后端已迁移至 Cloudflare Pages Functions (functions/api/)
 * Pages Functions 包含完整的：
 *   - 评语生成 (generate-comment.ts)
 *   - RAG 查询 (rag/query.ts)
 *   - 额度管理 (quota.ts)
 *   - 认证 (auth/)
 *   - 支付 (payment/)
 *   - 评论管理 (comments/)
 *   - 推荐系统 (referral.ts)
 *
 * 此文件仅保留作为参考，不应再用于生产环境。
 * 如需独立 Worker 后端，应从 Pages Functions 迁移完整功能。
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import comment from './routes/comment';
import { Env } from './types';

const app = new Hono<{ Bindings: Env }>();

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

app.use('/*', async (c, next) => {
  const clientIp = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() || 'unknown';
  const path = new URL(c.req.url).pathname;
  const now = Date.now();
  const rateKey = `${clientIp}:${path}`;
  const limit = path.includes('/generate') ? 5 : 30;

  const record = rateLimitMap.get(rateKey);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(rateKey, { count: 1, resetTime: now + 60000 });
  } else {
    record.count++;
    if (record.count > limit) {
      return c.json({ error: '请求过于频繁，请稍后再试', code: 'RATE_LIMITED' }, 429);
    }
  }

  if (Math.random() < 0.05) {
    for (const [k, rec] of rateLimitMap) {
      if (now > rec.resetTime) rateLimitMap.delete(k);
    }
  }

  await next();
});

app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return '';
    if (origin.endsWith('.minicode.cloud') || origin === 'https://minicode.cloud') return origin;
    if (origin.endsWith('.pages.dev')) return origin;
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return origin;
    return '';
  },
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Accept-Language'],
}));

app.get('/', async (c) => {
  return c.json({
    status: 'ok',
    service: 'teachers-backend',
    version: '1.0.0',
    ai_api: c.env.QWEN_API_KEY ? 'configured' : 'missing',
    timestamp: new Date().toISOString(),
  });
});

app.route('/', comment);

export default app;
