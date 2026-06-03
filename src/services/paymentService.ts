import { trackEvent } from './analytics';
import { authService } from './authService';

const API_BASE = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';

export interface OrderInfo {
  orderId: string;
  orderNo: string;
  planId: string;
  productName: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';
  qrcodeUrl?: string;
  payUrl?: string;
  createdAt: string;
  paidAt?: string;
}

export interface CreateOrderResult {
  success: boolean;
  order?: OrderInfo;
  error?: string;
  mockMode?: boolean;
}

export interface PaymentStatusResult {
  status: 'pending' | 'paid' | 'expired' | 'failed';
  paidAt?: string;
  transactionId?: string;
}

class PaymentService {
  private pollTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private activeOrders: Map<string, { resolve: (status: PaymentStatusResult) => void; reject: (err: Error) => void }> = new Map();

  async createOrder(planId: string): Promise<CreateOrderResult> {
    const token = authService.getAccessToken();
    const user = authService.getUser();
    const userId = user?.id || 'anonymous';

    try {
      const response = await fetch(`${API_BASE}/api/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          plan_id: planId,
          user_id: userId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'PAYMENT_NOT_CONFIGURED') {
          return { success: false, error: '支付系统正在配置中，敬请期待！', mockMode: true };
        }
        return { success: false, error: data.error || '创建订单失败' };
      }

      const order: OrderInfo = {
        orderId: data.order_id || crypto.randomUUID(),
        orderNo: data.order_id || '',
        planId,
        productName: this.getPlanName(planId),
        amount: data.amount || 0,
        currency: 'CNY',
        status: 'pending',
        qrcodeUrl: data.qrcode_url || data.mock_qrcode || '',
        payUrl: data.pay_url || '',
        createdAt: new Date().toISOString(),
      };

      trackEvent('PAYMENT_INITIATED', {
        product_type: planId,
        amount: order.amount,
        currency: 'CNY',
        order_id: order.orderId,
      });

      return { success: true, order, mockMode: !!data.mock_qrcode };
    } catch (err: any) {
      return { success: false, error: err.message || '网络异常，请稍后重试' };
    }
  }

  async checkStatus(orderId: string): Promise<PaymentStatusResult> {
    const token = authService.getAccessToken();

    try {
      const response = await fetch(`${API_BASE}/api/payment/status?order_id=${orderId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        return { status: 'pending' };
      }

      const data = await response.json();
      return {
        status: data.status || 'pending',
        paidAt: data.paid_at,
        transactionId: data.transaction_id,
      };
    } catch {
      return { status: 'pending' };
    }
  }

  pollUntilResolved(
    orderId: string,
    options?: { intervalMs?: number; timeoutMs?: number; onTick?: (elapsed: number) => void },
  ): Promise<PaymentStatusResult> {
    return new Promise((resolve, reject) => {
      const intervalMs = options?.intervalMs || 3000;
      const timeoutMs = options?.timeoutMs || 15 * 60 * 1000;
      const startTime = Date.now();

      if (this.activeOrders.has(orderId)) {
        reject(new Error(`Already polling order: ${orderId}`));
        return;
      }

      this.activeOrders.set(orderId, { resolve, reject });

      const poll = async () => {
        const elapsed = Date.now() - startTime;

        if (elapsed > timeoutMs) {
          this.stopPolling(orderId);
          resolve({ status: 'expired' });
          return;
        }

        options?.onTick?.(elapsed);

        try {
          const result = await this.checkStatus(orderId);

          if (result.status === 'paid') {
            this.stopPolling(orderId);
            trackEvent('PAYMENT_COMPLETED', {
              order_id: orderId,
              transaction_id: result.transactionId,
            });
            this.handlePaymentSuccess(orderId);
            resolve(result);
          } else if (result.status === 'failed') {
            this.stopPolling(orderId);
            resolve(result);
          }

        } catch (err) {
          console.warn('Poll payment status error:', err);
        }
      };

      poll();
      const timer = setInterval(poll, intervalMs);
      this.pollTimers.set(orderId, timer);
    });
  }

  stopPolling(orderId: string): void {
    const timer = this.pollTimers.get(orderId);
    if (timer) {
      clearInterval(timer);
      this.pollTimers.delete(orderId);
    }

    const pending = this.activeOrders.get(orderId);
    if (pending) {
      this.activeOrders.delete(orderId);
    }
  }

  stopAllPolling(): void {
    for (const orderId of this.pollTimers.keys()) {
      this.stopPolling(orderId);
    }
  }

  private async handlePaymentSuccess(orderId: string): Promise<void> {
    try {
      const apiBase = import.meta.env.VITE_RAG_API_URL || import.meta.env.VITE_API_BASE_URL || '/api';
      const token = authService.getAccessToken();

      const response = await fetch(`${apiBase}/api/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          authService.setUser(data.user);
        }
      }
    } catch (err) {
      console.error('Refresh user after payment failed:', err);
    }
  }

  getPlanName(planId: string): string {
    const names: Record<string, string> = {
      free: '免费版',
      single_comment: '高级评语·单条',
      bulk_class: '期末全班包',
      monthly: '专业版·月付',
      yearly: '专业版·年付',
      school: '学校版',
    };
    return names[planId] || planId;
  }

  getPlanPrice(planId: string): number {
    const prices: Record<string, number> = {
      free: 0,
      single_comment: 1.9,
      bulk_class: 9.9,
      monthly: 25,
      yearly: 168,
      school: 0,
    };
    return prices[planId] || 0;
  }

  formatPrice(amount: number): string {
    if (amount === 0) return '免费';
    return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
  }
}

export const paymentService = new PaymentService();
