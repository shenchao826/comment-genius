import React, { createContext, useContext, useState, useCallback } from 'react';
import { clsx } from 'clsx';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  toast: (message: string, options?: { type?: ToastType; duration?: number }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const icons: Record<ToastType, string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const bgColors: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-300 text-green-800',
  error: 'bg-red-50 border-red-300 text-red-800',
  warning: 'bg-amber-50 border-amber-300 text-amber-800',
  info: 'bg-blue-50 border-blue-300 text-blue-800',
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={clsx(
            'pointer-events-auto px-4 py-3 rounded-lg border shadow-lg cursor-pointer',
            'flex items-center gap-3 animate-slide-in-right',
            bgColors[t.type],
          )}
        >
          <span className="text-lg flex-shrink-0">{icons[t.type]}</span>
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(t.id); }}
            className="text-current/40 hover:text-current transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, options?: { type?: ToastType; duration?: number }): string => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const toast: Toast = {
      id,
      type: options?.type || 'info',
      message,
      duration: options?.duration ?? (options?.type === 'error' ? 5000 : 3000),
    };

    setToasts((prev) => [...prev.slice(-4), toast]);

    if ((toast.duration ?? 0) > 0) {
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), toast.duration);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toasts,
    toast: addToast,
    success: (msg) => addToast(msg, { type: 'success' }),
    error: (msg) => addToast(msg, { type: 'error' }),
    warning: (msg) => addToast(msg, { type: 'warning' }),
    info: (msg) => addToast(msg, { type: 'info' }),
    dismiss,
    clearAll: () => setToasts([]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};
