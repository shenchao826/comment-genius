// Sentry 错误监控工具（简化版）
// 注意：@sentry/cloudflare 的 API 可能因版本不同而变化
// 此版本使用动态导入和类型保护确保兼容性

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
}

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

let SentryInstance: any = null;

export async function initSentry(config: SentryConfig) {
  try {
    // 动态导入 Sentry
    const Sentry = await import('@sentry/cloudflare');
    SentryInstance = Sentry;

    // 安全初始化（处理可能的 API 差异）
    if (typeof (Sentry as any).init === 'function') {
      (Sentry as any).init({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        tracesSampleRate: config.tracesSampleRate || 0.2,
        profilesSampleRate: config.profilesSampleRate || 0.1,
        beforeSend(event: any) {
          if (event.request?.cookies) {
            delete event.request.cookies;
          }
          if (event.user) {
            delete event.user.email;
            delete event.user.ip_address;
          }
          return event;
        }
      });
    }

    console.log('✅ Sentry initialized successfully');
  } catch (error) {
    console.warn('⚠️ Sentry initialization failed:', error);
    // 不阻塞应用运行
    SentryInstance = null;
  }
}

export function captureException(error: Error, context?: Record<string, any>) {
  if (!SentryInstance) {
    console.error('Capture Exception:', error.message, context);
    return;
  }

  try {
    if (SentryInstance.captureException) {
      SentryInstance.captureException(error, {
        extra: context,
        tags: { product: 'teachers' }
      });
    } else {
      console.error('Sentry Error:', error.message, context);
    }
  } catch (_e) {
    console.error('Failed to capture exception:', _e);
  }
}

export function captureMessage(message: string, level: SeverityLevel = 'info') {
  if (!SentryInstance) {
    console.log(`[${level.toUpperCase()}] ${message}`);
    return;
  }

  try {
    if (SentryInstance.captureMessage) {
      SentryInstance.captureMessage(message, {
        level,
        tags: { product: 'teachers' }
      });
    } else {
      console.log(`[${level.toUpperCase()}] ${message}`);
    }
  } catch (e) {
    console.warn('Failed to capture message:', e);
  }
}

export function setUserContext(user: { id?: string; email?: string; name?: string }) {
  if (!SentryInstance?.setUser) return;

  try {
    SentryInstance.setUser(user);
  } catch (e) {
    console.warn('Failed to set user context:', e);
  }
}

export function setTag(key: string, value: string) {
  if (!SentryInstance?.setTag) return;

  try {
    SentryInstance.setTag(key, value);
  } catch (e) {
    console.warn('Failed to set tag:', e);
  }
}

export async function withSentryPerformance<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  if (!SentryInstance?.startSpan) {
    return fn();
  }

  try {
    return await SentryInstance.startSpan(
      { op: 'function', name: operation },
      fn
    );
  } catch {
    console.warn('Performance tracking failed, running without it');
    return fn();
  }
}
