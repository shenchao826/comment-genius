import { trackEvent } from './analytics';

export interface ClipboardResult {
  success: boolean;
  message: string;
}

class ClipboardService {
  private copyHistory: string[] = [];
  private maxHistory = 50;

  async copy(
    text: string,
    options?: { formatAs?: 'plain' | 'styled'; studentName?: string; title?: string },
  ): Promise<ClipboardResult> {
    if (!text.trim()) {
      return { success: false, message: '内容为空' };
    }

    const formattedText = this.formatText(text, options);
    const isDuplicate = this.isRecentCopy(formattedText);

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(formattedText);
      } else {
        this.fallbackCopy(formattedText);
      }

      this.recordCopy(formattedText);

      trackEvent('COMMENT_COPIED', {
        text_length: text.length,
        formatted_length: formattedText.length,
        has_student_name: !!options?.studentName,
        format_type: options?.formatAs || 'plain',
        is_duplicate: isDuplicate,
      });

      return { success: true, message: '已复制到剪贴板' };
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      try {
        this.fallbackCopy(formattedText);
        this.recordCopy(formattedText);
        return { success: true, message: '已复制到剪贴板（兼容模式）' };
      } catch {
        return { success: false, message: '复制失败，请手动选择复制' };
      }
    }
  }

  private formatText(
    text: string,
    options?: { formatAs?: 'plain' | 'styled'; studentName?: string; title?: string },
  ): string {
    if (options?.formatAs === 'styled' && options.studentName) {
      const title = options.title || '学生评语';
      const lines = [`【${title}】`, `学生：${options.studentName}`, '', text];
      const now = new Date().toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      lines.push('', `— ${now} 评语助手AI生成`);
      return lines.join('\n');
    }
    return text;
  }

  private fallbackCopy(text: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private recordCopy(text: string): void {
    this.copyHistory.unshift(text);
    if (this.copyHistory.length > this.maxHistory) {
      this.copyHistory.pop();
    }
  }

  private isRecentCopy(text: string): boolean {
    return this.copyHistory.slice(0, 10).some((item) => item === text);
  }

  get recentCopies(): readonly string[] {
    return this.copyHistory;
  }
}

export const clipboardService = new ClipboardService();
