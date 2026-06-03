import { trackEvent } from './analytics';

const STORAGE_KEY = 'teachers_favorites';
const MAX_LOCAL_FAVORITES = 200;

export interface FavoriteItem {
  commentId: string;
  content: string;
  studentName: string;
  traits: string[];
  commentType: string;
  toneStyle: string;
  favoritedAt: string;
}

class FavoritesService {
  private cache: Set<string> = new Set();
  private initialized = false;

  init() {
    if (this.initialized) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const items: FavoriteItem[] = JSON.parse(raw);
        items.forEach((item) => this.cache.add(item.commentId));
      }
      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  isFavorited(commentId: string): boolean {
    this.init();
    return this.cache.has(commentId);
  }

  getAll(): FavoriteItem[] {
    this.init();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  add(item: Omit<FavoriteItem, 'favoritedAt'>): FavoriteItem[] {
    this.init();
    const fullItem: FavoriteItem = { ...item, favoritedAt: new Date().toISOString() };
    this.cache.add(fullItem.commentId);

    const items = this.getAll();
    const exists = items.findIndex((i) => i.commentId === fullItem.commentId);
    if (exists >= 0) {
      items[exists] = fullItem;
    } else {
      items.unshift(fullItem);
    }
    if (items.length > MAX_LOCAL_FAVORITES) {
      const removed = items.pop();
      if (removed) this.cache.delete(removed.commentId);
    }
    this.save(items);
    trackEvent('COMMENT_FAVORITED', { comment_id: fullItem.commentId });
    return items;
  }

  remove(commentId: string): FavoriteItem[] {
    this.init();
    this.cache.delete(commentId);
    const items = this.getAll().filter((i) => i.commentId !== commentId);
    this.save(items);
    trackEvent('COMMENT_UNFAVORITED', { commentId });
    return items;
  }

  toggle(item: Omit<FavoriteItem, 'favoritedAt'>): { isFavorited: boolean; items: FavoriteItem[] } {
    if (this.isFavorited(item.commentId)) {
      return { isFavorited: false, items: this.remove(item.commentId) };
    }
    return { isFavorited: true, items: this.add(item) };
  }

  count(): number {
    this.init();
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  private save(items: FavoriteItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('Favorites storage quota exceeded, keeping only recent 50');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 50)));
      }
    }
  }

  async syncToRemote(
    commentId: string,
    isFavorited: boolean,
    getApiBase: () => string,
  ): Promise<{ success: boolean; error?: string }> {
    const token = localStorage.getItem('auth_token');
    if (!token) return { success: true };
    try {
      const apiBase = getApiBase();
      const res = await fetch(`${apiBase}/api/comments/${commentId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_favorited: isFavorited }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return { success: false, error: data.error || `同步失败 (${res.status})` };
      }
      return { success: true };
    } catch (err) {
      console.error('Sync favorite to remote failed:', err);
      return { success: false, error: '网络异常，已保存到本地' };
    }
  }
}

export const favoritesService = new FavoritesService();

export function useFavorites() {
  return favoritesService;
}
