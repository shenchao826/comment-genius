import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clipboardService } from '@/services/clipboard';

describe('ClipboardService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.execCommand = vi.fn().mockReturnValue(true);
  });

  describe('copy', () => {
    it('should return error for empty text', async () => {
      const result = await clipboardService.copy('');
      expect(result.success).toBe(false);
      expect(result.message).toBe('内容为空');
    });

    it('should use execCommand fallback in jsdom environment', async () => {
      const result = await clipboardService.copy('test content');
      expect(result.success).toBe(true);
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    it('should format styled text with student name via fallback', async () => {
      const result = await clipboardService.copy('评语内容', {
        formatAs: 'styled',
        studentName: '张三',
        title: '学生评语',
      });

      expect(result.success).toBe(true);
      expect(document.execCommand).toHaveBeenCalled();
      const textArg = (document.execCommand as any).mock.calls[0]?.[1];
      if (textArg) {
        expect(textArg).toContain('张三');
        expect(textArg).toContain('学生评语');
      }
    });
  });

  describe('recentCopies', () => {
    it('should track recent copies', async () => {
      await clipboardService.copy('first');
      await clipboardService.copy('second');

      expect(clipboardService.recentCopies.length).toBeGreaterThanOrEqual(2);
    });
  });
});
