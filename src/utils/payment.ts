/**
 * Teachers 支付订单模块
 *
 * 来源：复用 soulspark/backend/src/payment.ts 核心逻辑
 * 适配：Teachers产品定价和回调URL
 *
 * 支付方式：
 * 1. 虎皮椒微信支付（主）- 个人可用，全自动回调
 *    - 用户扫码付款 → 虎皮椒回调 → 自动开通会员
 * 2. PayPal Me（辅）- 海外用户，手动确认
 */

import { TEACHERS_PLANS, TeachersPlanId, HUPIJIAO_PRODUCT_NAMES } from '../config/pricing';

// ==================== 套餐定义（从pricing.ts导入）====================
export type { TeachersPlanId };
export { TEACHERS_PLANS };

// ==================== 订单号生成 ====================

/**
 * 生成唯一随机金额（微信支付用）
 * 基础价格 + 0.01~0.99 随机小数
 * 虎皮椒支持任意金额，用唯一金额可做二次校验
 */
export function generateUniqueAmount(basePrice: number): number {
  const cents = Math.floor(Math.random() * 99) + 1;
  return basePrice + cents / 100;
}

/**
 * 生成订单号
 * 格式: TC-{timestamp}-{random} (TC = Teacher Comment)
 */
export function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TC-${ts}-${rand}`;
}

/**
 * 计算订阅到期时间
 */
export function calculateEndDate(planId: TeachersPlanId): string {
  const plan = TEACHERS_PLANS[planId];
  const end = new Date();
  end.setDate(end.getDate() + plan.durationDays);
  return end.toISOString();
}

// ==================== PayPal Me（辅）====================

/**
 * 生成 PayPal Me 链接
 * 格式: https://paypal.me/{username}/{amount}USD
 */
export function generatePayPalMeLink(paypalUsername: string, amount: number): string {
  return `https://paypal.me/${paypalUsername}/${amount.toFixed(2)}USD`;
}

// ==================== 虎皮椒微信支付（主）====================

export interface HupijiaoConfig {
  appId: string; // 虎皮椒 App ID
  appSecret: string; // 虎皮椒 App Secret
  notifyUrl: string; // 支付成功回调地址 (Teachers专用)
}

/**
 * 获取Teachers虎皮椒配置
 * 回调URL: https://teachers.minicode.cloud/api/payment/callback
 */
export function getHupijiaoConfig(): HupijiaoConfig {
  return {
    appId: (globalThis as any).HUPIJIAO_APP_ID || '',
    appSecret: (globalThis as any).HUPIJIAO_APP_SECRET || '',
    notifyUrl: 'https://teachers.minicode.cloud/api/payment/callback',
  };
}

/**
 * 生成虎皮椒签名
 * 按文档要求：将参数按ASCII排序拼接 + appSecret，取MD5
 */
export async function generateHupijiaoSign(
  params: Record<string, string>,
  appSecret: string,
): Promise<string> {
  // 1. 按key的ASCII码排序
  const sortedKeys = Object.keys(params).sort();

  // 2. 拼接键值对（空值跳过）
  const pairs: string[] = [];
  for (const key of sortedKeys) {
    if (params[key] !== '' && params[key] !== undefined) {
      pairs.push(`${key}=${params[key]}`);
    }
  }
  const signStr = pairs.join('&') + appSecret;

  // 3. MD5 哈希（使用 Web Crypto API）
  const encoder = new TextEncoder();
  const data = encoder.encode(signStr);
  const hashBuffer = await crypto.subtle.digest('MD5', data).catch(() => {
    // Workers 环境可能不支持 MD5，使用 SHA-256 替代
    return crypto.subtle.digest('SHA-256', data);
  });

  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * 调用虎皮椒创建支付订单
 * 返回微信支付二维码URL
 */
export async function createHupijiaoOrder(
  config: HupijiaoConfig,
  orderId: string,
  totalFee: number,
  planId: TeachersPlanId,
): Promise<{ url_qrcode: string; url: string }> {
  const productName = HUPIJIAO_PRODUCT_NAMES[planId];

  const params: Record<string, string> = {
    version: '1.1',
    appid: config.appId,
    trade_order_id: orderId,
    total_fee: totalFee.toFixed(2),
    title: productName,
    time: Math.floor(Date.now() / 1000).toString(),
    notify_url: config.notifyUrl,
    nonce_str: Math.random().toString(36).substring(2, 14),
    type: 'WAP',
    wap_url: 'https://teachers.minicode.cloud',
    wap_name: '评语助手CommentGenius',
  };

  // 生成签名
  const hash = await generateHupijiaoSign(params, config.appSecret);
  params.hash = hash;

  // 调用虎皮椒API
  const response = await fetch('https://api.xunhupay.com/payment/do.html', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const result = (await response.json()) as any;

  if (result.errcode !== 0 && result.errcode !== undefined) {
    throw new Error(result.errmsg || '虎皮椒创建订单失败');
  }

  return {
    url_qrcode: result.url_qrcode || result.qr_code || '',
    url: result.url || '',
  };
}

/**
 * 验证虎皮椒回调签名
 */
export async function verifyHupijiaoCallback(
  params: Record<string, string>,
  appSecret: string,
): Promise<boolean> {
  const receivedHash = params.hash;
  if (!receivedHash) return false;

  // 移除hash参数后重新计算签名
  const paramsWithoutHash = { ...params };
  delete paramsWithoutHash.hash;

  const expectedHash = await generateHupijiaoSign(paramsWithoutHash, appSecret);
  return expectedHash === receivedHash;
}
