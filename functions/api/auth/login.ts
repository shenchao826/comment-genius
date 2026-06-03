import type { PagesFunction } from "@cloudflare/workers-types";
import { hashPassword, verifyPassword, signJWT, verifyJWT } from "../../lib/auth";

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { error: "请输入邮箱和密码" },
        { status: 400 }
      );
    }

    if (!env.DB) {
      const mockUser = {
        id: "user_mock",
        email: email,
        name: email.split("@")[0],
        is_premium: false,
        plan_type: "free",
      };

      const mockToken = btoa(JSON.stringify({
        ...mockUser,
        exp: Math.floor(Date.now() / 1000) + 86400,
      }));

      return Response.json({
        user: mockUser,
        token: mockToken,
        access_token: mockToken,
        refresh_token: mockToken,
        expires_in: 86400,
      });
    }

    const user = await env.DB.prepare(
      `SELECT * FROM users WHERE email = ?`
    ).bind(email).first();

    if (!user) {
      return Response.json(
        { error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(password, user.password_hash);

    if (!passwordMatch) {
      return Response.json(
        { error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    await env.DB.prepare(
      `UPDATE users SET last_login = datetime('now') WHERE id = ?`
    ).bind(user.id).run();

    const accessToken = await signJWT(
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

    const refreshToken = await signJWT(
      {
        sub: user.id,
        email: user.email,
        type: "refresh",
      },
      env.JWT_SECRET,
      86400 * 7
    );

    return Response.json({
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
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
    });
  } catch (error) {
    console.error("Login error:", error);
    return Response.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
};
