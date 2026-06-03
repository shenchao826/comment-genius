import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const authHeader = request.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return Response.json({ error: "未登录" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = verifyJWT(token, env.JWT_SECRET);

    if (!payload) {
      return Response.json({ error: "登录已过期，请重新登录" }, { status: 401 });
    }

    if (!env.DB) {
      return Response.json({
        id: payload.sub || payload.id,
        email: payload.email,
        name: payload.name,
        is_premium: payload.is_premium || false,
        plan_type: payload.plan_type || "free",
      });
    }

    const user = await env.DB.prepare(
      `SELECT id, email, name, avatar_url, is_premium, plan_type, trial_started_at, trial_ends_at, trial_used, created_at FROM users WHERE id = ?`
    ).bind(payload.sub || payload.id).first();

    if (!user) {
      return Response.json({ error: "用户不存在" }, { status: 404 });
    }

    return Response.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
      is_premium: !!user.is_premium,
      plan_type: user.plan_type || "free",
      trial_started_at: user.trial_started_at,
      trial_ends_at: user.trial_ends_at,
      trial_used: !!user.trial_used,
    });
  } catch (error) {
    console.error("Get user error:", error);
    return Response.json({ error: "服务器内部错误" }, { status: 500 });
  }
};

function verifyJWT(token: string, secret: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const payload = JSON.parse(atob(urlSafeDecode(payloadB64)));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function urlSafeDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return str;
}
