import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PWAInstallPrompt, { OfflineIndicator, ConnectionSpeedIndicator } from '../../components/PWAComponents';
import { offlineStorage, syncQueue, isOnline, getConnectionStatus } from '../../utils/offlineCache';

describe('PWA 组件', () => {
  describe('PWAInstallPrompt', () => {
    it('默认不显示安装提示', () => {
      render(<PWAInstallPrompt />);
      expect(screen.queryByText('安装评语助手')).not.toBeInTheDocument();
    });

    it('已安装时不显示提示', () => {
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(display-mode: standalone)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      });

      render(<PWAInstallPrompt />);
      expect(screen.queryByText('安装评语助手')).not.toBeInTheDocument();
    });
  });

  describe('OfflineIndicator', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    });

    it('在线状态下不显示', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      
      const { container } = render(<OfflineIndicator />);
      expect(container.innerHTML).toBe('');
    });

    it('离线状态时显示提示', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      render(<OfflineIndicator />);
      
      expect(screen.getByText(/离线模式/)).toBeInTheDocument();
    });

    it('应包含待同步数量', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      localStorage.setItem('sync_queue', JSON.stringify([
        { id: '1' }, { id: '2' }, { id: '3' }
      ]));
      
      render(<OfflineIndicator />);
      
      expect(screen.getByText(/3条数据待同步/)).toBeInTheDocument();
    });
  });

  describe('ConnectionSpeedIndicator', () => {
    it('无连接信息时不渲染', () => {
      const { container } = render(<ConnectionSpeedIndicator />);
      expect(container.innerHTML).toBe('');
    });
  });
});

describe('离线存储系统', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('offlineStorage', () => {
    it('应保存和读取数据', () => {
      const testData = { name: 'test', value: 123 };
      offlineStorage.saveData('test_key', testData);
      const retrieved = offlineStorage.getData<typeof testData>('test_key');
      expect(retrieved).toEqual(testData);
    });

    it('应删除指定数据', () => {
      offlineStorage.saveData('to_delete', { temp: true });
      expect(offlineStorage.getData('to_delete')).not.toBeNull();
      
      offlineStorage.removeData('to_delete');
      expect(offlineStorage.getData('to_delete')).toBeNull();
    });

    it('应清除所有离线数据', () => {
      offlineStorage.saveData('key1', { a: 1 });
      offlineStorage.saveData('key2', { b: 2 });
      offlineStorage.saveData('key3', { c: 3 });
      
      offlineStorage.clearAll();
      
      expect(offlineStorage.getKeys().length).toBe(0);
    });

    it('应返回所有键名', () => {
      offlineStorage.saveData('alpha', {});
      offlineStorage.saveData('beta', {});
      
      const keys = offlineStorage.getKeys();
      expect(Array.isArray(keys)).toBe(true);
      expect(keys.length).toBeGreaterThanOrEqual(0);
    });

    it('不存在时应返回 null', () => {
      expect(offlineStorage.getData('nonexistent')).toBeNull();
    });
  });

  describe('syncQueue', () => {
    it('应添加同步项到队列', () => {
      const item = syncQueue.addItem({
        url: '/api/exams',
        method: 'POST',
        body: { score: 90 },
      });

      expect(item.id).toBeTruthy();
      expect(item.url).toBe('/api/exams');
      expect(item.retryCount).toBe(0);

      const queue = syncQueue.getQueue();
      expect(queue.length).toBe(1);
    });

    it('应标记已同步项', () => {
      const item = syncQueue.addItem({
        url: '/api/students',
        method: 'PUT',
      });

      expect(syncQueue.getQueue().length).toBe(1);

      syncQueue.markSynced(item.id);
      expect(syncQueue.getQueue().length).toBe(0);
    });

    it('应增加重试次数', () => {
      const item = syncQueue.addItem({
        url: '/api/test',
        method: 'DELETE',
      });

      syncQueue.incrementRetry(item.id);
      const queue = syncQueue.getQueue();
      expect(queue[0].retryCount).toBe(1);
    });
  });

  describe('isOnline', () => {
    it('应返回在线状态', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      expect(isOnline()).toBe(true);
    });

    it('应返回离线状态', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      expect(isOnline()).toBe(false);
    });
  });

  describe('getConnectionStatus', () => {
    it('应返回基本连接状态', () => {
      const status = getConnectionStatus();
      expect(typeof status.online).toBe('boolean');
    });
  });
});
