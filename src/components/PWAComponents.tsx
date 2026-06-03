import { useEffect, useState, type FC } from 'react';
import { clsx } from 'clsx';

interface PWAInstallerProps {
  className?: string;
}

const PWAInstallPrompt: FC<PWAInstallerProps> = ({ className }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const checkInstalled = () => {
      setIsInstalled(
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true
      );
    };

    checkInstalled();

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt || isInstalled) return null;

  return (
    <div
      className={clsx(
        'fixed bottom-4 right-4 z-50 max-w-sm rounded-xl bg-white p-4 shadow-2xl border border-slate-200',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-3xl">📱</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900">安装评语助手</h4>
          <p className="mt-1 text-xs text-slate-600">
            添加到主屏幕，获得更好的使用体验（离线可用、全屏显示）
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleInstall}
              className="rounded-lg bg-blue-500 px-4 py-2 text-xs font-medium text-white hover:bg-blue-600 transition-colors"
            >
              立即安装
            </button>
            <button
              onClick={handleDismiss}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              稍后
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

interface OfflineIndicatorProps {
  className?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ className }) => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [syncQueueLength, setSyncQueueLength] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    try {
      const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
      setSyncQueueLength(queue.length);
    } catch {}
  }, []);

  if (isOffline) {
    return (
      <div
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium',
          className
        )}
      >
        📴 当前处于离线模式 - 部分功能可能受限
        {syncQueueLength > 0 && ` · ${syncQueueLength}条数据待同步`}
      </div>
    );
  }

  return null;
};

interface ConnectionSpeedProps {
  className?: string;
}

export const ConnectionSpeedIndicator: React.FC<ConnectionSpeedProps> = ({ className }) => {
  const [connectionInfo, setConnectionInfo] = useState<{
    effectiveType?: string;
    downlink?: number;
  }>({});

  useEffect(() => {
    const connection = (navigator as any).connection ||
                       (navigator as any).mozConnection ||
                       (navigator as any).webkitConnection;

    if (connection) {
      setConnectionInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
      });

      connection.addEventListener('change', () => {
        setConnectionInfo({
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
        });
      });
    }
  }, []);

  if (!connectionInfo.effectiveType) return null;

  const speedColors: Record<string, string> = {
    '4g': 'text-green-600',
    '3g': 'text-amber-600',
    '2g': 'text-orange-600',
    'slow-2g': 'text-red-600',
  };

  return (
    <span className={clsx('text-[10px]', speedColors[connectionInfo.effectiveType] || 'text-gray-500', className)}>
      {connectionInfo.effectiveType?.toUpperCase()}
      {connectionInfo.downlink ? ` ${connectionInfo.downlink}Mbps` : ''}
    </span>
  );
};

export default PWAInstallPrompt;
