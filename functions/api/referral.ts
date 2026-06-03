interface Env {
  DB: D1Database;
}

const referral = {
  // 生成唯一邀请码
  generateCode(): string {
    const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const CODE_LENGTH = 6;
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    return code;
  },

  // 获取或创建用户的邀请码
  async getCode(userId: string, env: Env) {
    if (!env.DB) {
      return { code: this.generateCode(), usage_count: 0 };
    }

    const existing = await env.DB.prepare(
      `SELECT code, usage_count FROM referral_codes WHERE user_id = ?`
    ).bind(userId).first();

    if (existing) {
      return existing;
    }

    let code = '';
    let attempts = 0;
    while (attempts < 10) {
      code = this.generateCode();
      try {
        await env.DB.prepare(
          `INSERT INTO referral_codes (user_id, code, created_at) VALUES (?, ?, datetime('now'))`
        ).bind(userId, code).run();
        break;
      } catch (e) {
        attempts++;
      }
    }

    return { code, usage_count: 0 };
  },

  // 使用邀请码
  async applyCode(userId: string, referralCode: string, env: Env) {
    if (!env.DB) {
      return { success: true, reward: '3次免费生成额度' };
    }

    // 检查是否已使用过邀请码
    const existingReferral = await env.DB.prepare(
      `SELECT id FROM referrals WHERE referee_id = ?`
    ).bind(userId).first();

    if (existingReferral) {
      return { error: '您已使用过邀请码', already_applied: true };
    }

    // 查找邀请码
    const codeRecord = await env.DB.prepare(
      `SELECT user_id FROM referral_codes WHERE code = ?`
    ).bind(referralCode.toUpperCase()).first();

    if (!codeRecord) {
      return { error: '邀请码无效' };
    }

    // 不能使用自己的邀请码
    if (codeRecord.user_id === userId) {
      return { error: '不能使用自己的邀请码' };
    }

    // 创建邀请记录
    await env.DB.prepare(
      `INSERT INTO referrals (referrer_id, referee_id, referral_code, status, created_at) VALUES (?, ?, ?, 'pending', datetime('now'))`
    ).bind(codeRecord.user_id, userId, referralCode.toUpperCase()).run();

    // 更新邀请码使用次数
    await env.DB.prepare(
      `UPDATE referral_codes SET usage_count = usage_count + 1 WHERE code = ?`
    ).bind(referralCode.toUpperCase()).run();

    // 给被邀请人发放免费额度
    await env.DB.prepare(
      `UPDATE daily_quota SET used_count = MAX(0, used_count - 3), is_premium = true WHERE user_id = ? AND date = date('now')`
    ).bind(userId).run();

    return {
      success: true,
      reward: '3次免费生成额度',
    };
  },

  // 获取邀请统计
  async getStats(userId: string, env: Env) {
    if (!env.DB) {
      return {
        code: this.generateCode(),
        total_invited: 0,
        completed: 0,
        pending: 0,
        rewards: [
          { threshold: 1, reward_type: "free_generations", reward_value: 3, description: "邀请1人：获赠3次免费生成", achieved: false, claimed: false },
          { threshold: 3, reward_type: "free_generations", reward_value: 10, description: "邀请3人：获赠10次免费生成", achieved: false, claimed: false },
          { threshold: 5, reward_type: "membership_days", reward_value: 7, description: "邀请5人：获得7天会员", achieved: false, claimed: false },
        ],
      };
    }

    const codeData = await this.getCode(userId, env);

    const referrals = await env.DB.prepare(
      `SELECT status, created_at FROM referrals WHERE referrer_id = ?`
    ).bind(userId).all();

    const allReferrals = referrals.results || [];
    const totalInvited = allReferrals.length;
    const completed = allReferrals.filter((r: any) => r.status === 'completed').length;
    const pending = allReferrals.filter((r: any) => r.status === 'pending').length;

    return {
      code: codeData.code || null,
      total_invited: totalInvited,
      completed,
      pending,
      rewards: [
        { threshold: 1, reward_type: "free_generations", reward_value: 3, description: "邀请1人：获赠3次免费生成", achieved: totalInvited >= 1, claimed: false },
        { threshold: 3, reward_type: "free_generations", reward_value: 10, description: "邀请3人：获赠10次免费生成", achieved: totalInvited >= 3, claimed: false },
        { threshold: 5, reward_type: "membership_days", reward_value: 7, description: "邀请5人：获得7天会员", achieved: totalInvited >= 5, claimed: false },
      ],
    };
  },

  // 完成邀请（用户首次生成评语后调用）
  async completeReferral(userId: string, env: Env) {
    if (!env.DB) {
      return { completed: false };
    }

    const referralRecord = await env.DB.prepare(
      `SELECT id, referrer_id FROM referrals WHERE referee_id = ? AND status = 'pending'`
    ).bind(userId).first();

    if (!referralRecord) {
      return { completed: false };
    }

    // 更新为已完成
    await env.DB.prepare(
      `UPDATE referrals SET status = 'completed', completed_at = datetime('now') WHERE id = ?`
    ).bind(referralRecord.id).run();

    // 给邀请人增加免费额度
    await env.DB.prepare(
      `UPDATE daily_quota SET used_count = MAX(0, used_count - 2) WHERE user_id = ? AND date = date('now')`
    ).bind(referralRecord.referrer_id).run();

    return { completed: true };
  },
};

export default referral;
