import type { D1Database } from '@cloudflare/workers-types';

// Cloudflare Pages/Workers 环境变量类型定义
export interface Env {
  // D1 数据库
  DB: D1Database;
  
  // KV 存储（用于限流等）
  RATE_LIMIT_KV?: KVNamespace;
  
  // JWT 密钥
  JWT_SECRET: string;
  
  // Supabase 配置（如果使用）
  SUPABASE_URL?: string;
  SUPABASE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  
  // AI 服务配置
  QWEN_API_KEY: string;
  
  // 支付配置
  HUPIJIAO_APP_ID: string;
  HUPIJIAO_APP_SECRET: string;
  HUPIJIAO_NOTIFY_URL: string;
  
  // 管理员令牌
  ADMIN_TOKEN: string;
  
  // PayPal（可选）
  PAYPAL_ME_USERNAME?: string;
  
  // Sentry（可选）
  SENTRY_DSN?: string;
  
  // 环境标识
  ENVIRONMENT?: 'development' | 'staging' | 'production';
}

// Pages Function 上下文类型
export interface PagesFunctionContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
  waitUntil: (promise: Promise<any>) => void;
}

// 类型导出
export type { D1Database };
