interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

// Analytics event types per spec §9.3
export const ANALYTICS_EVENTS = {
  // User lifecycle events
  USER_SIGN_UP: 'user_sign_up',
  USER_LOGIN: 'user_login',
  
  // Core feature events
  COMMENT_GENERATED: 'comment_generated',
  COMMENT_EDITED: 'comment_edited',
  COMMENT_COPIED: 'comment_copied',
  COMMENT_FAVORITED: 'comment_favorited',
  COMMENT_UNFAVORITED: 'comment_unfavorited',
  COMMENT_SHARED: 'comment_shared',
  
  // Conversion events
  PRICING_PAGE_VIEWED: 'pricing_page_viewed',
  PAYMENT_INITIATED: 'payment_initiated',
  PAYMENT_COMPLETED: 'payment_completed',
  
  // Feature discovery events
  BULK_GENERATE_USED: 'bulk_generate_used',
  STUDENT_IMPORTED: 'student_imported',
  TEMPLATE_SELECTED: 'template_selected',
  
  // Engagement events
  FEEDBACK_SUBMITTED: 'feedback_submitted',
  HISTORY_VIEWED: 'history_viewed',
  SEARCH_PERFORMED: 'search_performed',
} as const;

type AnalyticsEventType = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = import.meta.env.MODE === 'production';
    
    if (typeof window !== 'undefined' && this.isEnabled) {
      this.flushInterval = setInterval(() => this.flush(), 10000); // 每10秒发送一次
      window.addEventListener('beforeunload', () => this.flush());
    }
  }

  track(eventType: AnalyticsEventType, properties?: Record<string, any>) {
    if (!this.isEnabled) return;

    const event: AnalyticsEvent = {
      event: eventType,
      properties: {
        ...properties,
        url: window.location.href,
        user_agent: navigator.userAgent,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    };

    this.queue.push(event);

    // 立即发送关键事件（转化事件）
    const criticalEvents: string[] = [ANALYTICS_EVENTS.PAYMENT_COMPLETED];
    if (criticalEvents.includes(eventType as string)) {
      this.flush();
    }
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      const token = localStorage.getItem('auth_token');
      
      await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          events: eventsToSend,
          product: 'teachers'
        })
      });

    } catch (error) {
      console.error('Analytics flush failed:', error);
      // 失败的事件重新加入队列
      this.queue.unshift(...eventsToSend);
    }
  }

  // Convenience methods for common tracking scenarios
  trackCommentGenerated(params: {
    comment_id: string;
    comment_type: string;
    style: string;
    length_type: string;
    trait_count: number;
    word_count: number;
    generation_time_ms: number;
    is_premium: boolean;
  }) {
    this.track(ANALYTICS_EVENTS.COMMENT_GENERATED, params);
  }

  trackPaymentInitiated(params: {
    product_type: string;
    amount: number;
    currency: string;
  }) {
    this.track(ANALYTICS_EVENTS.PAYMENT_INITIATED, params);
  }

  trackPaymentCompleted(params: {
    order_id: string;
    product_type: string;
    amount: number;
    payment_method: string;
  }) {
    this.track(ANALYTICS_EVENTS.PAYMENT_COMPLETED, params);
  }

  trackPageView(pageName: string) {
    this.track(`page_view_${pageName}` as any, {
      page: pageName,
      referrer: document.referrer
    });
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    this.flush(); // 发送剩余事件
  }
}

// Singleton instance
const analyticsService = new AnalyticsService();
export default analyticsService;

export function trackEvent(eventType: string, properties?: Record<string, any>) {
  analyticsService.track(eventType as AnalyticsEventType, properties);
}
