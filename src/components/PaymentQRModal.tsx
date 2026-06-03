import { useState, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import Button from './Button';

interface PaymentQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  qrcodeUrl?: string;
  amount: number;
  productName: string;
  onSuccess?: () => void;
}

const PaymentQRModal: React.FC<PaymentQRModalProps> = ({
  isOpen,
  onClose,
  orderId,
  qrcodeUrl,
  amount,
  productName,
  onSuccess
}) => {
  const [status, setStatus] = useState<'pending' | 'paid' | 'expired' | 'error'>('pending');
  const [countdown, setCountdown] = useState(900);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!isOpen || !orderId) return;

    setStatus('pending');
    setCountdown(900);
    setElapsedSec(0);

    const countdownTimer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimer);
          setStatus('expired');
          paymentService.stopPolling(orderId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    paymentService
      .pollUntilResolved(orderId, {
        intervalMs: 3000,
        timeoutMs: 15 * 60 * 1000,
        onTick: (elapsedMs) => setElapsedSec(Math.floor(elapsedMs / 1000)),
      })
      .then((result) => {
        if (result.status === 'paid') {
          setStatus('paid');
          clearInterval(countdownTimer);
          setTimeout(() => {
            onSuccess?.();
            onClose();
          }, 2000);
        } else if (result.status === 'expired') {
          setStatus('expired');
        } else if (result.status === 'failed') {
          setStatus('error');
        }
      })
      .catch(() => {
        setStatus('error');
      });

    return () => {
      clearInterval(countdownTimer);
      paymentService.stopPolling(orderId);
    };
  }, [isOpen, orderId, onSuccess, onClose]);

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">💳 扫码支付</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200 text-2xl leading-none">
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center">
            <p className="text-lg font-semibold text-slate-900">{productName}</p>
            <p className="text-3xl font-bold text-red-500 mt-2">¥{amount.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">订单号：{orderId.slice(0, 8)}...</p>
          </div>

          <div className="flex justify-center">
            <div className={`
              relative p-4 border-2 rounded-xl transition-all duration-300
              ${status === 'paid' ? 'border-green-500 bg-green-50' : 'border-slate-200'}
              ${status === 'expired' ? 'border-amber-300 bg-amber-50' : ''}
            `}>
              {qrcodeUrl ? (
                <img
                  src={qrcodeUrl}
                  alt="Payment QR Code"
                  className={`w-48 h-48 transition-opacity duration-300 ${status !== 'pending' ? 'opacity-30' : ''}`}
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center rounded-lg">
                  <span className="text-slate-400">加载中...</span>
                </div>
              )}

              {status === 'paid' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 rounded-lg">
                  <div className="text-center">
                    <div className="text-5xl mb-2 animate-bounce">✅</div>
                    <p className="text-green-700 font-bold text-lg">支付成功</p>
                    <p className="text-green-600 text-sm">正在跳转...</p>
                  </div>
                </div>
              )}

              {status === 'expired' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl mb-2">⏰</div>
                    <p className="text-slate-700 font-bold">二维码已过期</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors"
                    >
                      刷新重试
                    </button>
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                  <div className="text-center">
                    <div className="text-4xl mb-2">⚠️</div>
                    <p className="text-slate-700 font-bold">查询异常</p>
                    <p className="text-xs text-slate-500 mt-1">请确认支付状态或重试</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {status === 'pending' && (
            <div className="text-center space-y-2">
              <p className="text-sm text-slate-600">
                请在 <strong className="text-red-500">{formatTime(countdown)}</strong> 内完成支付
              </p>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(countdown / 900) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-500">支持微信、支付宝扫码 · 已等待 {elapsedSec}秒</p>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 text-sm">💡 支付步骤：</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>打开微信或支付宝扫一扫</li>
              <li>确认金额并完成支付</li>
              <li>支付成功后自动跳转（如未跳转请手动刷新）</li>
            </ol>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex gap-3">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            取消
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onClose();
              onSuccess?.();
            }}
            disabled={status !== 'paid'}
            className="flex-1"
          >
            {status === 'paid' ? '已完成 ✓' : '我已支付'}
          </Button>
        </div>

        <p className="px-6 pb-4 text-xs text-slate-500 text-center">
          如遇问题请联系客服：teachers@minicode.cloud
        </p>
      </div>
    </div>
  );
};

export default PaymentQRModal;
