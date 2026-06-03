import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { favoritesService } from '@/services/favorites';

describe('FavoritesService', () => {
  beforeEach(() => {
    favoritesService.clear();
    localStorage.clear();
    (favoritesService as any).initialized = false;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should start with no favorites', () => {
    expect(favoritesService.count()).toBe(0);
    expect(favoritesService.isFavorited('nonexistent')).toBe(false);
  });

  it('should add a favorite and mark as favorited', () => {
    const items = favoritesService.add({
      commentId: 'comment-1',
      content: '测试评语',
      studentName: '张三',
      traits: ['认真'],
      commentType: 'general',
      toneStyle: 'gentle',
    });

    expect(favoritesService.isFavorited('comment-1')).toBe(true);
    expect(items[0].commentId).toBe('comment-1');
    expect(items.length).toBe(1);
  });

  it('should remove a favorite', () => {
    favoritesService.add({
      commentId: 'comment-1',
      content: '测试',
      studentName: '',
      traits: [],
      commentType: 'general',
      toneStyle: 'gentle',
    });
    expect(favoritesService.count()).toBe(1);

    const remaining = favoritesService.remove('comment-1');
    expect(favoritesService.isFavorited('comment-1')).toBe(false);
    expect(remaining.length).toBe(0);
  });

  it('should toggle favorite state', () => {
    const result1 = favoritesService.toggle({
      commentId: 'comment-1',
      content: '测试',
      studentName: '',
      traits: [],
      commentType: 'general',
      toneStyle: 'gentle',
    });
    expect(result1.isFavorited).toBe(true);

    const result2 = favoritesService.toggle({
      commentId: 'comment-1',
      content: '测试',
      studentName: '',
      traits: [],
      commentType: 'general',
      toneStyle: 'gentle',
    });
    expect(result2.isFavorited).toBe(false);
  });

  it('should persist to localStorage', () => {
    favoritesService.add({
      commentId: 'persist-test',
      content: '持久化测试',
      studentName: '',
      traits: [],
      commentType: 'general',
      toneStyle: 'gentle',
    });

    const raw = localStorage.getItem('teachers_favorites');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.some((item: any) => item.commentId === 'persist-test')).toBe(true);
  });

  it('should enforce max limit', () => {
    for (let i = 0; i < 250; i++) {
      favoritesService.add({
        commentId: `comment-${i}`,
        content: `内容${i}`,
        studentName: '',
        traits: [],
        commentType: 'general',
        toneStyle: 'gentle',
      });
    }
    const count = favoritesService.getAll().length;
    expect(count).toBeLessThanOrEqual(250);
  });
});
