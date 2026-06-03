import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return Response.json({ error: "缺少 refresh_token" }, { status: 400 });
    }

    const payload = verifyJWT(refresh_token, env.JWT_SECRET);

    if (!payload) {
      return Response.json({ error: "refresh_token 无效或已过期" }, { status: 401 });
    }

    if (payload.type !== "refresh") {
      return Response.json({ error: "token 类型错误" }, { status: 401 });
    }

    const userId = payload.sub || payload.id;

    let user: any = null;
    if (env.DB) {
      user = await env.DB.prepare(
        `SELECT id, email, name, avatar_url, is_premium, plan_type, trial_started_at, trial_ends_at, trial_used FROM users WHERE id = ?`
      ).bind(userId).first();
    }

    if (!user && !env.DB) {
      user = {
        id: userId,
        email: payload.email,
        name: payload.name,
        is_premium: payload.is_premium || false,
        plan_type: payload.plan_type || "free",
      };
    }

    if (!user) {
      return Response.json({ error: "用户不存在" }, { status: 404 });
    }

    const newAccessToken = await signToken(
      {
        sub: user.id,
        email: user.email,
        name: user.name,
        is_premium: !!user.is_premium,
        plan_type: user.plan_type || "free",
        type: "access",
      },
      env.JWT_SECRET,
      3600
    );

    const newRefreshToken = await signToken(
      {
        sub: user.id,
        email: user.email,
        type: "refresh",
      },
      env.JWT_SECRET,
      86400 * 7
    );

    return Response.json({
      access_token: newAccessToken,
      token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 3600,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        is_premium: !!user.is_premium,
        plan_type: user.plan_type || "free",
        trial_started_at: user.trial_started_at,
        trial_ends_at: user.trial_ends_at,
        trial_used: !!user.trial_used,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    return Response.json({ error: "服务器内部错误" }, { status: 500 });
  }
};

async function signToken(payload: any, secret: string, expiresIn: number): Promise<string> {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const now = Math.floor(Date.now() / 1000);
  const payloadWithExp = { ...payload, iat: now, exp: now + expiresIn };

  const payloadB64 = btoa(JSON.stringify(payloadWithExp))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const signingInput = `${header}.${payloadB64}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  return `${signingInput}.${signatureB64}`;
}

function verifyJWT(token: string, secret: string): any {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    const header = JSON.parse(atob(urlSafeDecode(headerB64)));
    if (header.alg !== "HS256") return null;

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
