import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorId: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorId: `err_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorId: '' });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white rounded-xl border border-red-200 shadow-lg p-8 text-center space-y-5">
            <span className="text-6xl">💥</span>
            <h1 className="text-2xl font-bold text-slate-900">页面出错了</h1>

            <div className="bg-slate-50 rounded-lg p-4 text-left">
              <p className="text-sm font-mono text-red-600 break-all">
                {this.state.error?.message || '未知错误'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                错误ID: {this.state.errorId}
              </p>
            </div>

            <p className="text-sm text-slate-500">
              请尝试刷新页面，如果问题持续存在，请联系客服
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🔄 重试
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
              >
                🏠 返回首页
              </button>
            </div>

            <a
              href={`mailto:support@minicode.cloud?subject=错误报告 - ${this.state.errorId}&body=${encodeURIComponent(
                `页面地址: ${window.location.pathname}\n\n错误信息:\n${this.state.error?.stack || 'N/A'}\n\n用户代理: ${navigator.userAgent}`
              )}`}
              className="inline-block text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              📧 报告此问题
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

interface AsyncErrorProps {
  onRetry?: () => void;
  message?: string;
}

export const AsyncErrorFallback: React.FC<AsyncErrorProps> = ({ onRetry, message = '加载失败' }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 space-y-3">
    <span className="text-4xl">⚠️</span>
    <p className="text-slate-600 font-medium">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        重试
      </button>
    )}
  </div>
);
