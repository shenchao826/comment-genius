const OFFLINE_DATA_PREFIX = 'offline_';
const MAX_OFFLINE_RECORDS = 200;

export interface OfflineRecord {
  id: string;
  type: 'exam' | 'conversation' | 'home_visit' | 'behavior';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
  synced: boolean;
}

export interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  retryCount: number;
  createdAt: string;
}

class OfflineStorage {
  private static instance: OfflineStorage;

  private constructor() {}

  static getInstance(): OfflineStorage {
    if (!OfflineStorage.instance) {
      OfflineStorage.instance = new OfflineStorage();
    }
    return OfflineStorage.instance;
  }

  saveData(key: string, data: unknown): void {
    try {
      localStorage.setItem(`${OFFLINE_DATA_PREFIX}${key}`, JSON.stringify({
        data,
        savedAt: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Failed to save offline data:', error);
      this.evictOldestData();
      this.saveData(key, data);
    }
  }

  getData<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${OFFLINE_DATA_PREFIX}${key}`);
      if (!stored) return null;
      const parsed = JSON.parse(stored);
      return parsed.data as T;
    } catch {
      return null;
    }
  }

  removeData(key: string): void {
    localStorage.removeItem(`${OFFLINE_DATA_PREFIX}${key}`);
  }

  clearAll(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(OFFLINE_DATA_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }

  getKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(OFFLINE_DATA_PREFIX)) {
        keys.push(key.replace(OFFLINE_DATA_PREFIX, ''));
      }
    }
    return keys;
  }

  private evictOldestData(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(OFFLINE_DATA_PREFIX)) {
        try {
          const stored = JSON.parse(localStorage.getItem(key) || '');
          if (stored.savedAt && new Date(stored.savedAt).getTime() < oldestTime) {
            oldestTime = new Date(stored.savedAt).getTime();
            oldestKey = key;
          }
        } catch {}
      }
    }

    if (oldestKey) {
      localStorage.removeItem(oldestKey);
    }
  }

  getSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(OFFLINE_DATA_PREFIX)) {
        size += (localStorage.getItem(key) || '').length;
      }
    }
    return size;
  }
}

export const offlineStorage = OfflineStorage.getInstance();

class SyncQueue {
  private queueKey = 'sync_queue';

  addItem(item: Omit<OfflineQueueItem, 'id' | 'retryCount' | 'createdAt'>): OfflineQueueItem {
    const queue = this.getQueue();
    const newItem: OfflineQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };

    queue.push(newItem);

    if (queue.length > MAX_OFFLINE_RECORDS) {
      queue.shift();
    }

    this.saveQueue(queue);
    return newItem;
  }

  getQueue(): OfflineQueueItem[] {
    try {
      const stored = localStorage.getItem(this.queueKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  markSynced(id: string): void {
    const queue = this.getQueue();
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
      queue.splice(index, 1);
      this.saveQueue(queue);
    }
  }

  incrementRetry(id: string): void {
    const queue = this.getQueue();
    const item = queue.find(i => i.id === id);
    if (item) {
      item.retryCount++;
      this.saveQueue(queue);
    }
  }

  clearCompleted(): void {
    const queue = this.getQueue().filter(item => !(item as any).synced);
    this.saveQueue(queue);
  }

  private saveQueue(queue: OfflineQueueItem[]): void {
    try {
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }
}

export const syncQueue = new SyncQueue();

export function isOnline(): boolean {
  return navigator.onLine !== false;
}

export async function waitForConnection(timeout: number = 5000): Promise<boolean> {
  if (isOnline()) return true;

  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);

    window.addEventListener('online', () => {
      clearTimeout(timer);
      resolve(true);
    }, { once: true });
  });
}

export interface ConnectionStatus {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function getConnectionStatus(): ConnectionStatus {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  return {
    online: isOnline(),
    effectiveType: connection?.effectiveType,
    downlink: connection?.downlink,
    rtt: connection?.rtt,
    saveData: connection?.saveData,
  };
}

export class PWAInstaller {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  init(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e as BeforeInstallPromptEvent;
    });

    window.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
    });
  }

  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  async promptInstall(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    const result = await this.deferredPrompt.prompt();
    this.deferredPrompt = null;
    return result.outcome === 'accepted';
  }

  isInstalled(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }
}

export const pwaInstaller = new PWAInstaller();

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: 'accepted' | 'dismissed' }>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
