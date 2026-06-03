import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FaqSection, { DEFAULT_ITEMS, DEFAULT_CATEGORIES } from '../../components/FaqSection';

function getExpandedCount(container: HTMLElement): number {
  return container.querySelectorAll('.grid-rows-\\[1fr\\]').length;
}

describe('FaqSection - 常见问题组件', () => {
  describe('基础渲染', () => {
    it('应显示标题和默认问题数量', () => {
      render(<FaqSection />);
      expect(screen.getByText('❓ 常见问题')).toBeInTheDocument();
      expect(screen.getByText(`${DEFAULT_ITEMS.length} 条`)).toBeInTheDocument();
    });

    it('应显示所有分类筛选按钮', () => {
      render(<FaqSection />);
      expect(screen.getByText('全部')).toBeInTheDocument();
      for (const cat of DEFAULT_CATEGORIES) {
        expect(screen.getByText(cat.label)).toBeInTheDocument();
      }
    });

    it('默认显示所有 FAQ 项的问题文本', () => {
      render(<FaqSection />);
      for (const item of DEFAULT_ITEMS) {
        expect(screen.getByText(item.question)).toBeInTheDocument();
      }
    });
  });

  describe('折叠/展开交互', () => {
    it('默认情况下所有答案都处于折叠状态', () => {
      const { container } = render(<FaqSection />);
      expect(getExpandedCount(container)).toBe(0);
    });

    it('点击问题后应展开显示答案', async () => {
      const { container } = render(<FaqSection />);
      expect(getExpandedCount(container)).toBe(0);

      fireEvent.click(screen.getByText(DEFAULT_ITEMS[0].question));

      await waitFor(() => {
        expect(getExpandedCount(container)).toBe(1);
      });
    });

    it('再次点击已展开项应折叠', async () => {
      const { container } = render(<FaqSection />);
      const firstQuestion = screen.getByText(DEFAULT_ITEMS[0].question);

      fireEvent.click(firstQuestion);
      await waitFor(() => { expect(getExpandedCount(container)).toBe(1); });

      fireEvent.click(firstQuestion);
      await waitFor(() => { expect(getExpandedCount(container)).toBe(0); });
    });

    it('maxExpanded=1 时，展开第二项应自动收起第一项', async () => {
      const { container } = render(<FaqSection maxExpanded={1} />);

      const q1 = screen.getByText(DEFAULT_ITEMS[0].question);
      const q2 = screen.getByText(DEFAULT_ITEMS[1].question);

      fireEvent.click(q1);
      await waitFor(() => { expect(getExpandedCount(container)).toBe(1); });

      fireEvent.click(q2);
      await waitFor(() => {
        expect(getExpandedCount(container)).toBe(1);
      });
    });

    it('maxExpanded=0 或不限制时应允许同时展开多项', async () => {
      const { container } = render(<FaqSection maxExpanded={0} />);
      fireEvent.click(screen.getByText(DEFAULT_ITEMS[0].question));
      fireEvent.click(screen.getByText(DEFAULT_ITEMS[1].question));

      await waitFor(() => {
        expect(getExpandedCount(container)).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('分类筛选', () => {
    it('点击"使用指南"分类应只显示该类问题', () => {
      render(<FaqSection />);
      const usageBtn = screen.getByText('使用指南');
      fireEvent.click(usageBtn);

      const usageItems = DEFAULT_ITEMS.filter(i => i.category === 'usage');
      const nonUsageItems = DEFAULT_ITEMS.filter(i => i.category !== 'usage');

      for (const item of usageItems) {
        expect(screen.getByText(item.question)).toBeInTheDocument();
      }
      for (const item of nonUsageItems) {
        expect(screen.queryByText(item.question)).not.toBeInTheDocument();
      }
    });

    it('点击"全部"按钮应恢复显示所有问题', () => {
      render(<FaqSection />);
      fireEvent.click(screen.getByText('计费与额度'));
      fireEvent.click(screen.getByText('全部'));

      for (const item of DEFAULT_ITEMS) {
        expect(screen.getByText(item.question)).toBeInTheDocument();
      }
    });

    it('再次点击已选中分类应取消筛选', () => {
      render(<FaqSection />);
      const billingBtn = screen.getByText('计费与额度');
      fireEvent.click(billingBtn);
      expect(screen.queryByText(DEFAULT_ITEMS[0].question)).not.toBeInTheDocument();

      fireEvent.click(billingBtn);
      expect(screen.getByText(DEFAULT_ITEMS[0].question)).toBeInTheDocument();
    });

    it('空分类应显示空状态提示', () => {
      const emptyItems: typeof DEFAULT_ITEMS = [];
      render(<FaqSection items={emptyItems} />);
      fireEvent.click(screen.getByText('使用指南'));
      expect(screen.getByText('该分类下暂无问题')).toBeInTheDocument();
    });
  });

  describe('自定义配置', () => {
    it('支持自定义标题', () => {
      render(<FaqSection title="帮助中心" />);
      expect(screen.getByText('帮助中心')).toBeInTheDocument();
      expect(screen.queryByText('❓ 常见问题')).not.toBeInTheDocument();
    });

    it('支持 defaultExpanded 默认展开指定项', () => {
      const { container } = render(<FaqSection defaultExpanded="how-to-generate" />);
      expect(screen.getByText(/如何生成一条评语/)).toBeInTheDocument();
      expect(getExpandedCount(container)).toBe(1);
    });

    it('支持自定义 className', () => {
      const { container } = render(<FaqSection className="custom-faq-class" />);
      expect(container.querySelector('.custom-faq-class')).toBeInTheDocument();
    });

    it('支持自定义 FAQ items', () => {
      const customItems = [
        {
          id: 'test-1',
          question: '测试问题？',
          answer: '测试回答',
          category: 'usage' as const,
        },
      ];
      render(<FaqSection items={customItems} />);
      expect(screen.getByText('测试问题？')).toBeInTheDocument();
      expect(screen.getByText('1 条')).toBeInTheDocument();
      expect(screen.queryByText('如何生成评语')).not.toBeInTheDocument();
    });
  });

  describe('导出验证', () => {
    it('应导出 DEFAULT_ITEMS 常量（12条）', () => {
      expect(DEFAULT_ITEMS).toHaveLength(12);
      expect(DEFAULT_ITEMS.every(i => i.id && i.question && i.answer && i.category)).toBe(true);
    });

    it('应导出 DEFAULT_CATEGORIES 常量（4类）', () => {
      expect(DEFAULT_CATEGORIES).toHaveLength(4);
      expect(DEFAULT_CATEGORIES.map(c => c.key)).toEqual(
        expect.arrayContaining(['usage', 'billing', 'data', 'troubleshoot'])
      );
    });

    it('应导出 FaqItem 和 FaqConfig 接口类型', () => {
      expect(typeof FaqSection).toBe('function');
    });
  });
});
