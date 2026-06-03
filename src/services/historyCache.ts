const STORAGE_KEY = 'teachers_history_cache';
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

export interface CachedComment {
  id: string;
  localId: string;
  student_name: string;
  content: string;
  traits: string[];
  comment_type: string;
  tone_style: string;
  comment_length: string;
  supplement?: string;
  class_role?: string | null;
  word_count: number;
  is_favorited: boolean;
  created_at: string;
  synced: boolean;
  syncAttempted: boolean;
}

class HistoryCacheService {
  private cache: CachedComment[] = [];
  private initialized = false;

  init() {
    if (this.initialized) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: CachedComment[] = JSON.parse(raw);
        const now = Date.now();
        this.cache = parsed.filter((item) => {
          const itemTime = new Date(item.created_at).getTime();
          return now - itemTime < CACHE_TTL;
        });
        if (this.cache.length !== parsed.length) {
          this.save();
        }
      }
      this.initialized = true;
    } catch {
      this.initialized = true;
    }
  }

  add(comment: Omit<CachedComment, 'localId' | 'created_at' | 'synced' | 'syncAttempted'>): CachedComment {
    this.init();
    const cached: CachedComment = {
      ...comment,
      localId: `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      created_at: new Date().toISOString(),
      synced: !!comment.id,
      syncAttempted: !!comment.id,
    };

    const existingIdx = this.cache.findIndex(
      (c) => c.id && c.id === comment.id || c.localId === cached.localId,
    );
    if (existingIdx >= 0) {
      this.cache[existingIdx] = { ...this.cache[existingIdx], ...cached };
    } else {
      this.cache.unshift(cached);
    }

    this.enforceLimit();
    this.save();
    return cached;
  }

  getAll(): CachedComment[] {
    this.init();
    return [...this.cache];
  }

  getRecent(limit = 20): CachedComment[] {
    this.init();
    return this.cache.slice(0, limit);
  }

  getById(id: string): CachedComment | undefined {
    this.init();
    return this.cache.find((c) => c.id === id || c.localId === id);
  }

  update(id: string, updates: Partial<CachedComment>): CachedComment | null {
    this.init();
    const idx = this.cache.findIndex((c) => c.id === id || c.localId === id);
    if (idx < 0) return null;
    this.cache[idx] = { ...this.cache[idx], ...updates };
    this.save();
    return this.cache[idx];
  }

  remove(id: string): boolean {
    this.init();
    const len = this.cache.length;
    this.cache = this.cache.filter((c) => c.id !== id && c.localId !== id);
    if (this.cache.length !== len) {
      this.save();
      return true;
    }
    return false;
  }

  getUnsynced(): CachedComment[] {
    this.init();
    return this.cache.filter((c) => !c.synced && !c.syncAttempted);
  }

  markSynced(localId: string, remoteId: string): void {
    this.init();
    const item = this.cache.find((c) => c.localId === localId);
    if (item) {
      item.id = remoteId;
      item.synced = true;
      item.syncAttempted = true;
      this.save();
    }
  }

  markSyncFailed(localId: string): void {
    this.init();
    const item = this.cache.find((c) => c.localId === localId);
    if (item) {
      item.syncAttempted = true;
      this.save();
    }
  }

  count(): number {
    this.init();
    return this.cache.length;
  }

  clear(): void {
    this.cache = [];
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  mergeWithRemote(remoteComments: { id: string; student_name: string; content: string; traits: string[]; comment_type: string; tone_style: string; created_at: string; is_favorited?: boolean }[]): { added: number; updated: number } {
    this.init();
    let added = 0;
    let updated = 0;

    for (const remote of remoteComments) {
      const existing = this.cache.find((c) => c.id === remote.id);
      if (existing) {
        Object.assign(existing, {
          content: remote.content,
          student_name: remote.student_name,
          traits: remote.traits,
          comment_type: remote.comment_type,
          tone_style: remote.tone_style,
          is_favorited: remote.is_favorited || existing.is_favorited,
          synced: true,
          syncAttempted: true,
        });
        updated++;
      } else {
        this.cache.push({
          ...remote,
          localId: `remote_${remote.id}`,
          word_count: remote.content.length,
          synced: true,
          syncAttempted: true,
        } as CachedComment);
        added++;
      }
    }

    this.cache.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    this.enforceLimit();
    this.save();
    return { added, updated };
  }

  private enforceLimit(): void {
    if (this.cache.length > MAX_CACHE_SIZE) {
      const removed = this.cache.splice(MAX_CACHE_SIZE);
      removed.forEach((item) => {
        if (item.is_favorited) {
          this.cache.pop();
          this.cache.unshift(item);
        }
      });
      if (this.cache.length > MAX_CACHE_SIZE) {
        this.cache = this.cache.slice(0, MAX_CACHE_SIZE);
      }
    }
  }

  private save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('History cache quota exceeded, keeping only recent 30');
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache.slice(0, 30)));
      }
    }
  }
}

export const historyCache = new HistoryCacheService();
