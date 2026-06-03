/**
 * Teachers 额度管理API
 * 
 * 规格书要求：
 * - 未登录用户：3条/天（基于IP + device fingerprint）
 * - 已登录用户：5条/天
 * - 付费会员：无限次
 * 
 * 路由：
 * GET /api/quota?user_id=xxx&is_logged_in=true → 查询剩余额度
 * POST /api/quota → 扣减额度
 */

interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

/**
 * 从请求中提取客户端标识
 * 未登录：使用 IP + User-Agent fingerprint
 * 已登录：从 JWT token 解析 user_id
 */
function getClientIdentity(request: Request): { userId: string; isLoggedIn: boolean } {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payloadB64 = parts[1]
          .replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - payloadB64.length % 4) % 4;
        const padded = payloadB64 + '='.repeat(padLen);
        const payload = JSON.parse(atob(padded));
        if (payload.sub || payload.user_id || payload.id) {
          return { userId: payload.sub || payload.user_id || payload.id, isLoggedIn: true };
        }
      }
    } catch (e) {
    }
  }

  // 未登录：基于 IP + User-Agent 生成 fingerprint
  const ip = request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown';
  const ua = request.headers.get('User-Agent') || '';
  const fingerprint = `anon:${ip}:${ua.slice(0, 50)}`;
  return { userId: fingerprint, isLoggedIn: false };
}

/**
 * 从数据库查询用户会员状态
 */
async function getUserPremiumStatus(env: Env, userId: string): Promise<boolean> {
  if (!env.DB) return false;
  try {
    const user = await env.DB.prepare(
      `SELECT is_premium, plan_type FROM users WHERE id = ?`
    ).bind(userId).first();
    return !!(user?.is_premium || (user?.plan_type && user.plan_type !== 'free'));
  } catch (e) {
    return false;
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { userId, isLoggedIn } = getClientIdentity(request);
    // is_premium 从数据库查询，不接受前端参数
    const isPremium = isLoggedIn ? await getUserPremiumStatus(env, userId) : false;
    const today = new Date().toISOString().split("T")[0];

    // 规格书6.1节：免费版5条/天，未登录3条/天
    const baseLimit = isLoggedIn ? 5 : 3;

    if (!env.DB) {
      return Response.json({
        remaining: baseLimit,
        limit: baseLimit,
        used: 0,
        reset_at: new Date(Date.now() + 86400000).toISOString(),
        is_premium: isPremium,
        is_logged_in: isLoggedIn,
      });
    }

    // 查询今日额度使用情况
    const result = await env.DB.prepare(
      `SELECT * FROM daily_quota WHERE user_id = ? AND date = ?`
    ).bind(userId, today).first();

    if (!result) {
      return Response.json({
        remaining: baseLimit,
        limit: baseLimit,
        used: 0,
        reset_at: new Date(Date.now() + 86400000).toISOString(),
        is_premium: isPremium,
        is_logged_in: isLoggedIn,
      });
    }

    // 付费用户无限额度
    if (isPremium || result.is_premium) {
      return Response.json({
        remaining: -1, // -1表示无限
        limit: -1,
        used: result.used_count || 0,
        reset_at: null,
        is_premium: true,
        is_logged_in: isLoggedIn,
      });
    }

    const limit = result.limit_cap || baseLimit;
    const used = result.used_count || 0;
    const remaining = Math.max(0, limit - used);

    return Response.json({
      remaining,
      limit,
      used,
      reset_at: new Date(Date.now() + 86400000).toISOString(),
      is_premium: false,
      is_logged_in: isLoggedIn,
    });

  } catch (error) {
    console.error("Get quota error:", error);
    return Response.json(
      { error: "Failed to get quota" },
      { status: 500 }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { userId, isLoggedIn } = getClientIdentity(request);
    // is_premium 从数据库查询，不接受前端参数
    const isPremium = isLoggedIn ? await getUserPremiumStatus(env, userId) : false;
    const today = new Date().toISOString().split("T")[0];

    // 规格书6.1节：免费版5条/天，未登录3条/天
    const baseLimit = isLoggedIn ? 5 : 3;

    if (!env.DB) {
      const remaining = Math.max(0, baseLimit - 1);
      return Response.json({ 
        success: true, 
        remaining, 
        used: 1, 
        limit: baseLimit,
        is_premium: isPremium, 
      });
    }

    // 查询或创建今日额度记录
    const existing = await env.DB.prepare(
      `SELECT * FROM daily_quota WHERE user_id = ? AND date = ?`
    ).bind(userId, today).first();

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO daily_quota (user_id, date, used_count, limit_cap, is_premium) VALUES (?, ?, 1, ?, ?)`
      ).bind(userId, today, baseLimit, isPremium).run();

      return Response.json({ 
        success: true, 
        remaining: Math.max(0, baseLimit - 1), 
        used: 1, 
        limit: baseLimit,
        is_premium: isPremium, 
      });
    }

    // 付费用户直接放行
    if (isPremium || existing.is_premium) {
      await env.DB.prepare(
        `UPDATE daily_quota SET used_count = used_count + 1 WHERE id = ?`
      ).bind(existing.id).run();

      return Response.json({
        success: true,
        remaining: -1,
        used: (existing.used_count || 0) + 1,
        limit: -1,
        is_premium: true,
      });
    }

    const limit = existing.limit_cap || baseLimit;
    const newCount = (existing.used_count || 0) + 1;

    // 超出额度限制
    if (newCount > limit) {
      return Response.json(
        { 
          error: "Daily quota exceeded", 
          code: "QUOTA_EXCEEDED", 
          remaining: 0,
          message: isLoggedIn 
            ? "今日免费额度已用完（5条），升级会员可无限使用" 
            : "游客每日限3条，登录后可获得5条/天",
          upgrade_url: "/membership"
        },
        { status: 429 }
      );
    }

    // 扣减额度
    await env.DB.prepare(
      `UPDATE daily_quota SET used_count = ? WHERE id = ?`
    ).bind(newCount, existing.id).run();

    return Response.json({
      success: true,
      remaining: Math.max(0, limit - newCount),
      used: newCount,
      limit,
      is_premium: false,
    });

  } catch (error) {
    console.error("Update quota error:", error);
    return Response.json(
      { error: "Failed to update quota" },
      { status: 500 }
    );
  }
};
