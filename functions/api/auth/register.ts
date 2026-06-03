import type { PagesFunction } from "@cloudflare/workers-types";
import { hashPassword, signJWT } from "../../lib/auth";

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return Response.json(
        { error: "邮箱、密码和姓名均为必填项" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: "密码长度至少为6位" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    if (!env.DB) {
      const mockUser = {
        id: `user_${Date.now()}`,
        email: email,
        name: name,
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
      }, { status: 201 });
    }

    const existingUser = await env.DB.prepare(
      `SELECT id FROM users WHERE email = ?`
    ).bind(email).first();

    if (existingUser) {
      return Response.json(
        { error: "该邮箱已被注册" },
        { status: 409 }
      );
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const passwordHash = await hashPassword(password);

    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, name, is_premium, plan_type, created_at) VALUES (?, ?, ?, ?, FALSE, 'free', datetime('now'))`
    ).bind(userId, email, passwordHash, name).run();

    await env.DB.prepare(
      `INSERT INTO daily_quota (user_id, date, used_count, is_premium) VALUES (?, date('now'), 0, FALSE)`
    ).bind(userId).run();

    const accessToken = await signJWT(
      {
        sub: userId,
        email: email,
        name: name,
        is_premium: false,
        plan_type: "free",
        type: "access",
      },
      env.JWT_SECRET,
      3600
    );

    const refreshToken = await signJWT(
      {
        sub: userId,
        email: email,
        type: "refresh",
      },
      env.JWT_SECRET,
      86400 * 7
    );

    return Response.json({
      user: {
        id: userId,
        email: email,
        name: name,
        is_premium: false,
        plan_type: "free",
      },
      token: accessToken,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return Response.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }
};
