export interface AppError {
  code: string;
  message: string;
  details?: string;
  originalError?: Error;
  isNetworkError: boolean;
  isTimeout: boolean;
  isAbort: boolean;
}

export class AppException extends Error implements AppError {
  code: string;
  details?: string;
  originalError?: Error;
  isNetworkError: boolean;
  isTimeout: boolean;
  isAbort: boolean;

  constructor(
    message: string,
    options: {
      code?: string;
      details?: string;
      originalError?: Error;
      isNetworkError?: boolean;
      isTimeout?: boolean;
      isAbort?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'AppException';
    this.code = options.code || 'UNKNOWN_ERROR';
    this.details = options.details;
    this.originalError = options.originalError;
    this.isNetworkError = options.isNetworkError || false;
    this.isTimeout = options.isTimeout || false;
    this.isAbort = options.isAbort || false;
  }

  static fromError(error: unknown): AppException {
    if (error instanceof AppException) return error;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new AppException('操作已取消', { code: 'ABORTED', isAbort: true, originalError: error });
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        return new AppException('网络连接失败，请检查网络后重试', {
          code: 'NETWORK_ERROR',
          isNetworkError: true,
          originalError: error
        });
      }

      if (error.message.includes('timeout') || error.name === 'TimeoutError') {
        return new AppException('请求超时，请稍后重试', {
          code: 'TIMEOUT',
          isTimeout: true,
          originalError: error
        });
      }

      return new AppException(error.message, { code: 'RUNTIME_ERROR', originalError: error });
    }

    if (typeof error === 'string') {
      return new AppException(error);
    }

    return new AppException('未知错误', { code: 'UNKNOWN_ERROR' });
  }
}

export function getErrorMessage(error: unknown, fallback: string = '操作失败，请重试'): string {
  const appErr = AppException.fromError(error);
  
  const userFriendlyMessages: Record<string, string> = {
    NETWORK_ERROR: '网络连接失败，请检查您的网络连接',
    TIMEOUT: '服务器响应超时，请稍后重试',
    ABORTED: '操作已取消',
    UNAUTHORIZED: '登录已过期，请重新登录',
    FORBIDDEN: '您没有权限执行此操作',
    NOT_FOUND: '请求的资源不存在',
    SERVER_ERROR: '服务器内部错误，请联系管理员',
    RATE_LIMITED: '操作过于频繁，请稍后再试',
    VALIDATION_ERROR: '输入数据有误，请检查后重试',
    QUOTA_EXCEEDED: '今日使用次数已用完，明天再来吧',
  };

  return userFriendlyMessages[appErr.code] || appErr.message || fallback;
}

export function classifyError(error: unknown): 'network' | 'server' | 'client' | 'unknown' {
  const appErr = AppException.fromError(error);
  
  if (appErr.isNetworkError || appErr.isTimeout) return 'network';
  if (appErr.code.startsWith('5')) return 'server';
  if (appErr.code.startsWith('4') && appErr.code !== '401' && appErr.code !== '403') return 'client';
  return 'unknown';
}

export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallbackValue: T,
  onError?: (error: AppException) => void
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const appErr = AppException.fromError(error);
    console.error('[safeAsync]', appErr.code, appErr.message);
    onError?.(appErr);
    return fallbackValue;
  }
}

export function createRetryHandler<T>(
  maxRetries: number = 3,
  delayMs: number = 1000,
  backoffMultiplier: number = 2
) {
  return async (
    operation: () => Promise<T>,
    shouldRetry?: (error: AppException, attempt: number) => boolean
  ): Promise<T> => {
    let lastError: AppException | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = AppException.fromError(error);

        // 不重试的情况：已中止、客户端错误、或自定义判断
        if (
          lastError.isAbort ||
          lastError.code.startsWith('4') ||
          (shouldRetry && !shouldRetry(lastError, attempt))
        ) {
          throw lastError;
        }

        if (attempt < maxRetries) {
          const delay = delayMs * Math.pow(backoffMultiplier, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  };
}

const retryHandler = createRetryHandler();

export function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  return retryHandler(operation) as Promise<T>;
}
