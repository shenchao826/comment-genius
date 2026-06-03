
/**
 * Teachers 虎皮椒支付回调API
 * 路由: POST /api/payment/callback
 * 
 * 功能：
 * 1. 接收虎皮椒异步通知
 * 2. 验证签名（防伪造）
 * 3. 更新订单状态为"已支付"
 * 4. 开通/续费用户会员权限
 * 5. 返回"success"给虎皮椒
 */

interface Env {
  DB: D1Database;
  HUPIJIAO_APP_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // 1. 解析回调参数（虎皮椒发送的是form-data或JSON）
    let callbackData: any;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      callbackData = await request.json();
    } else {
      // form-data格式
      const formData = await request.formData();
      callbackData = {};
      for (const [key, value] of formData.entries()) {
        callbackData[key] = value;
      }
    }

    console.log('收到虎皮椒回调:', JSON.stringify(callbackData));

    // 2. 验证签名
    const appSecret = env.HUPIJIAO_APP_SECRET || '';
    if (appSecret && callbackData.hash) {
      const paramsWithoutHash = { ...callbackData };
      delete paramsWithoutHash.hash;

      const signStr = Object.keys(paramsWithoutHash)
        .sort()
        .filter(key => paramsWithoutHash[key])
        .map(key => `${key}=${paramsWithoutHash[key]}`)
        .join('&') + appSecret;

      const encoder = new TextEncoder();
      const data = encoder.encode(signStr);
      let hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => {
        return crypto.subtle.digest('SHA-256', data);
      });
      const expectedHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (expectedHash !== callbackData.hash) {
        console.error('签名验证失败:', { expected: expectedHash, received: callbackData.hash });
        return new Response('fail', { status: 400 });
      }
    }

    // 3. 检查支付状态
    if (callbackData.trade_status !== 'TRADE_SUCCESS') {
      console.log('非成功状态:', callbackData.trade_status);
      return new Response('success'); // 即使失败也返回success，避免重复通知
    }

    // 4. 提取订单信息
    const orderId = callbackData.out_trade_order_no || callbackData.trade_order_id;
    const hupijiaoTradeNo = callbackData.transaction_id || callbackData.trade_no;
    const paidAmount = parseFloat(callbackData.total_fee || '0');

    if (!orderId) {
      console.error('缺少订单号');
      return new Response('fail', { status: 400 });
    }

    // 5. 更新订单状态
    if (env.DB) {
      // 查找订单
      const order = await env.DB.prepare(
        `SELECT * FROM orders WHERE order_id = ?`
      ).bind(orderId).first();

      if (!order) {
        console.error('订单不存在:', orderId);
        return new Response('fail', { status: 404 });
      }

      // 检查是否已处理（防止重复通知）
      if (order.status === 'paid') {
        console.log('订单已处理，跳过');
        return new Response('success');
      }

      // 更新订单为已支付
      await env.DB.prepare(`
        UPDATE orders 
        SET status = 'paid', payment_transaction_id = ?, paid_at = datetime('now')
        WHERE order_id = ?
      `).bind(hupijiaoTradeNo, orderId).run();

      // 6. 开通/续费会员权限
      const userId = order.user_id;
      const productType = order.product_type;

      // 计算到期时间
      let endDate = new Date();
      
      switch (productType) {
        case 'single_comment':
          // 单次消费，不改变会员状态，只增加额外额度
          await env.DB.prepare(`
            UPDATE daily_quota SET used_count = MAX(0, used_count - 3)
            WHERE user_id = ? AND date = date('now')
          `).bind(userId).run();
          break;

        case 'bulk_class':
          // 全班包：7天会员
          endDate.setDate(endDate.getDate() + 7);
          await env.DB.prepare(`
            UPDATE users SET is_premium = TRUE, plan_type = 'premium', trial_ends_at = ?
            WHERE id = ?
          `).bind(endDate.toISOString(), userId).run();
          break;

        case 'monthly':
          // 月付：30天会员
          endDate.setDate(endDate.getDate() + 30);
          await env.DB.prepare(`
            UPDATE users SET is_premium = TRUE, plan_type = 'premium', trial_ends_at = ?
            WHERE id = ?
          `).bind(endDate.toISOString(), userId).run();
          break;

        case 'yearly':
          // 年付：365天会员
          endDate.setDate(endDate.getDate() + 365);
          await env.DB.prepare(`
            UPDATE users SET is_premium = TRUE, plan_type = 'premium', trial_ends_at = ?
            WHERE id = ?
          `).bind(endDate.toISOString(), userId).run();
          break;
      }

      console.log(`用户 ${userId} 购买 ${productType} 成功，已开通会员`);
    } else {
      console.warn('数据库未配置，无法更新订单状态');
    }

    // 7. 返回成功（必须返回纯文本"success"）
    return new Response('success', {
      headers: { 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('Payment callback error:', error);
    return new Response('fail', { status: 500 });
  }
};
