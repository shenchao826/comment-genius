import { describe, it, expect } from 'vitest';

// ===== 从 commentService.ts 提取的辅助函数 =====

function getTypeLabel(type: string): string {
  const typeMap: Record<string, string> = {
    summary: '\u671f\u672b\u603b\u7ed3',
    encouragement: '\u65e5\u5e38\u9f13\u52b1',
    improvement: '\u6539\u8fdb\u5efa\u8bae',
    parent: '\u5bb6\u957f\u6c9f\u901a',
    midterm: '\u671f\u4e2d\u53cd\u9988',
    single_subject: '\u5355\u79d1\u8bc4\u8bed',
    growth_report: '\u6210\u957f\u7b80\u62a5'
  };
  return typeMap[type] || type;
}

function getStyleLabel(style: string): string {
  const styleMap: Record<string, string> = {
    gentle: '\u6e29\u548c\u9f13\u52b1',
    formal: '\u6b63\u5f0f\u4e25\u8c28',
    humorous: '\u5e7d\u9ed8\u4eb2\u5207',
    objective: '\u5ba2\u89c2\u4e2d\u7acb',
    warm: '\u6e29\u6696\u4eb2\u5207'
  };
  return styleMap[style] || style;
}

function getLengthLabel(length: string): string {
  const lengthMap: Record<string, string> = {
    concise: '\u7cbe\u7b80\u7248(80-120\u5b57)',
    standard: '\u6807\u51c6\u7248(200-300\u5b57)',
    detailed: "\u8be6\u7ec6\u7248(400-500\u5b57)"
  };
  return lengthMap[length] || length;
}

// ===== 测试用例 =====

describe('CommentService 辅助函数', () => {

  describe('getTypeLabel - 评语类型标签', () => {
    it('所有已知类型应返回正确的中文标签', () => {
      expect(getTypeLabel('summary')).toBe('\u671f\u672b\u603b\u7ed3');
      expect(getTypeLabel('encouragement')).toBe('\u65e5\u5e38\u9f13\u52b1');
      expect(getTypeLabel('improvement')).toBe('\u6539\u8fdb\u5efa\u8bae');
      expect(getTypeLabel('parent')).toBe('\u5bb6\u957f\u6c9f\u901a');
      expect(getTypeLabel('midterm')).toBe('\u671f\u4e2d\u53cd\u9988');
      expect(getTypeLabel('single_subject')).toBe('\u5355\u79d1\u8bc4\u8bed');
      expect(getTypeLabel('growth_report')).toBe('\u6210\u957f\u7b80\u62a5');
    });

    it('未知类型应原样返回', () => {
      expect(getTypeLabel('unknown_type')).toBe('unknown_type');
      expect(getTypeLabel('')).toBe('');
    });
  });

  describe('getStyleLabel - 风格标签', () => {
    it('所有已知风格应返回正确的中文标签', () => {
      expect(getStyleLabel('gentle')).toBe('\u6e29\u548c\u9f13\u52b1');
      expect(getStyleLabel('formal')).toBe('\u6b63\u5f0f\u4e25\u8c28');
      expect(getStyleLabel('humorous')).toBe('\u5e7d\u9ed8\u4eb2\u5207');
      expect(getStyleLabel('objective')).toBe('\u5ba2\u89c2\u4e2d\u7acb');
      expect(getStyleLabel('warm')).toBe('\u6e29\u6696\u4eb2\u5207');
    });

    it('未知风格应原样返回', () => {
      expect(getStyleLabel('aggressive')).toBe('aggressive');
    });
  });

  describe('getLengthLabel - 长度标签', () => {
    it('所有已知长度选项应返回正确标签', () => {
      expect(getLengthLabel('concise')).toContain('80-120');
      expect(getLengthLabel('standard')).toContain('200-300');
      expect(getLengthLabel('detailed')).toContain('400-500');
    });

    it('各长度标签应包含"版"字', () => {
      expect(getLengthLabel('concise')).toContain('\u7248');
      expect(getLengthLabel('standard')).toContain('\u7248');
      expect(getLengthLabel('detailed')).toContain('\u7248');
    });

    it('未知长度应原样返回', () => {
      expect(getLengthLabel('super_long')).toBe('super_long');
    });
  });

  describe('组合使用场景', () => {
    it('完整评语参数组合应生成可读性好的标签', () => {
      const type = getTypeLabel('summary');
      const style = getStyleLabel('warm');
      const length = getLengthLabel('standard');

      expect(type).toBe('\u671f\u672b\u603b\u7ed3');
      expect(style).toBe('\u6e29\u6696\u4eb2\u5207');
      expect(length).toContain('200-300');
    });

    it('批量生成场景下的参数映射', () => {
      const bulkParams = [
        { type: 'encouragement', style: 'gentle', length: 'concise' },
        { type: 'improvement', style: 'strict', length: 'detailed' }, // strict 会 fallback
        { type: 'parent', style: 'formal', length: 'standard' },
      ];

      const labels = bulkParams.map(p => ({
        type: getTypeLabel(p.type),
        style: getStyleLabel(p.style),
        length: getLengthLabel(p.length),
      }));

      expect(labels[0].type).toBe('\u65e5\u5e38\u9f13\u52b1');
      expect(labels[0].style).toBe('\u6e29\u548c\u9f13\u52b1');
      expect(labels[1].style).toBe('strict'); // 未知风格 fallback
      expect(labels[2].type).toBe('\u5bb6\u957f\u6c9f\u901a');
    });
  });
});
