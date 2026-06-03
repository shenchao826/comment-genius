
/**
 * Teachers 支付订单创建API
 * 路由: POST /api/payment/create
 * 
 * 功能：
 * 1. 接收前端套餐选择
 * 2. 生成唯一订单号
 * 3. 调用虎皮椒创建支付订单
 * 4. 返回二维码URL给前端展示
 */

interface Env {
  DB: D1Database;
  HUPIJIAO_APP_ID?: string;
  HUPIJIAO_APP_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // 1. 解析请求参数
    const body = await request.json();
    const { plan_id, user_id } = body;

    if (!plan_id || !user_id) {
      return Response.json(
        { error: '缺少必要参数: plan_id, user_id' },
        { status: 400 }
      );
    }

    // 2. 验证套餐ID
    const validPlans = ['single_comment', 'bulk_class', 'monthly', 'yearly'];
    if (!validPlans.includes(plan_id)) {
      return Response.json(
        { error: '无效的套餐ID' },
        { status: 400 }
      );
    }

    // 3. 价格映射（规格书6.1节）
    const planPrices: Record<string, number> = {
      single_comment: 1.9,
      bulk_class: 9.9,
      monthly: 25,
      yearly: 168,
    };

    const basePrice = planPrices[plan_id];

    // 4. 生成唯一金额（防重复）
    const uniqueAmount = basePrice + Math.floor(Math.random() * 99 + 1) / 100;

    // 5. 生成订单号
    const orderId = `TC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 6. 商品名称
    const productNames: Record<string, string> = {
      single_comment: '评语助手-高级评语单条',
      bulk_class: '评语助手-期末全班包',
      monthly: '评语助手-专业版月度会员',
      yearly: '评语助手-专业版年度会员',
    };
    const title = productNames[plan_id];

    // 7. 保存订单到数据库（如果可用）
    if (env.DB) {
      await env.DB.prepare(`
        INSERT INTO orders (id, user_id, order_id, product_type, amount, currency, status)
        VALUES (?, ?, ?, ?, ?, 'CNY', 'pending')
      `).bind(
        crypto.randomUUID(),
        user_id,
        orderId,
        plan_id,
        uniqueAmount
      ).run();
    }

    // 8. 构建虎皮椒请求参数
    const appId = env.HUPIJIAO_APP_ID || '';
    const appSecret = env.HUPIJIAO_APP_SECRET || '';

    if (!appId || !appSecret) {
      return Response.json({
        error: '支付系统未配置',
        code: 'PAYMENT_NOT_CONFIGURED',
        debug_mode: true, // 开发环境标记
        mock_qrcode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`mock_payment_${orderId}`)}`,
      }, { status: 500 });
    }

    const params: Record<string, string> = {
      version: '1.1',
      appid: appId,
      trade_order_id: orderId,
      total_fee: uniqueAmount.toFixed(2),
      title,
      time: Math.floor(Date.now() / 1000).toString(),
      notify_url: 'https://teachers.minicode.cloud/api/payment/callback',
      nonce_str: Math.random().toString(36).substring(2, 14),
      type: 'WAP',
      wap_url: 'https://teachers.minicode.cloud',
      wap_name: '评语助手CommentGenius',
    };

    // 9. 生成签名（MD5）
    const signStr = Object.keys(params)
      .sort()
      .filter(key => params[key])
      .map(key => `${key}=${params[key]}`)
      .join('&') + appSecret;

    // 使用Web Crypto API计算MD5（Workers环境）
    const encoder = new TextEncoder();
    const data = encoder.encode(signStr);
    let hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => {
      return crypto.subtle.digest('SHA-256', data); // fallback
    });
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    params.hash = hash;

    // 10. 调用虎皮椒API
    const response = await fetch('https://api.xunhupay.com/payment/do.html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const result = await response.json();

    if (result.errcode !== 0 && result.errcode !== undefined) {
      console.error('虎皮椒错误:', result);
      return Response.json(
        { error: result.errmsg || '创建支付订单失败' },
        { status: 500 }
      );
    }

    // 11. 返回成功响应
    return Response.json({
      success: true,
      order_id: orderId,
      amount: uniqueAmount,
      qrcode_url: result.url_qrcode || result.qr_code || '',
      pay_url: result.url || '',
      expires_in: 900, // 15分钟过期
    });

  } catch (error) {
    console.error('Create payment order error:', error);
    return Response.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
};
