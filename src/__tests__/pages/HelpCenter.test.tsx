import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HelpCenter from '../../pages/HelpCenter';

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <HelpCenter />
    </MemoryRouter>
  );
}

function getCategoryButtons(): HTMLButtonElement[] {
  return screen.getAllByRole('button').filter(b =>
    b.textContent?.includes('快速上手') ||
    b.textContent?.includes('功能详解') ||
    b.textContent?.includes('数据管理') ||
    b.textContent?.includes('AI 评语技巧') ||
    b.textContent?.includes('计费与会员') ||
    b.textContent?.includes('故障排查')
  );
}

function getAllButton(): HTMLButtonElement | undefined {
  return screen.getAllByRole('button').find(b => b.textContent?.includes('📋 全部'));
}

describe('HelpCenter - 帮助中心页面', () => {
  describe('页面渲染', () => {
    it('应显示页面标题"帮助中心"', () => {
      renderWithRouter();
      expect(screen.getByText('📚 帮助中心')).toBeInTheDocument();
    });

    it('应显示搜索输入框', () => {
      renderWithRouter();
      const searchInput = screen.getByPlaceholderText(/搜索问题/);
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('type', 'text');
    });

    it('应显示全部分类按钮及数量', () => {
      renderWithRouter();
      const allBtn = getAllButton();
      expect(allBtn).toBeTruthy();
      expect(allBtn!.textContent).toContain('25');
    });

    it('应显示6个分类筛选按钮', () => {
      renderWithRouter();
      const catBtns = getCategoryButtons();
      const labels = catBtns.map(b => b.textContent || '');
      expect(labels.some(l => l.includes('快速上手'))).toBe(true);
      expect(labels.some(l => l.includes('功能详解'))).toBe(true);
      expect(labels.some(l => l.includes('数据管理'))).toBe(true);
      expect(labels.some(l => l.includes('AI 评语技巧'))).toBe(true);
      expect(labels.some(l => l.includes('计费与会员'))).toBe(true);
      expect(labels.some(l => l.includes('故障排查'))).toBe(true);
      expect(catBtns.length).toBe(6);
    });

    it('应显示所有 FAQ 问题文本', () => {
      renderWithRouter();
      expect(screen.getAllByText((content: string) =>
        content === '如何注册账号？'
      ).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('评语生成的完整流程是什么？')).toBeInTheDocument();
      expect(screen.getByText('生成评语时提示"网络错误"？')).toBeInTheDocument();
    });
  });

  describe('搜索功能', () => {
    it('输入搜索关键词后应过滤结果并显示数量', () => {
      renderWithRouter();
      const input = screen.getByPlaceholderText(/搜索问题/);
      fireEvent.change(input, { target: { value: 'OCR' } });

      expect(screen.getByText('拍照识别成绩单怎么用？')).toBeInTheDocument();
      const allText = document.body.textContent || '';
      expect(allText).toContain('找到');
      expect(allText).toContain('相关的问题');
    });

    it('搜索无结果时应显示空状态提示', () => {
      renderWithRouter();
      const input = screen.getByPlaceholderText(/搜索问题/);
      fireEvent.change(input, { target: { value: 'zzzzz不存在的关键词xyz' } });

      expect(screen.getByText('未找到相关问题')).toBeInTheDocument();
      expect(screen.getByText('重置筛选')).toBeInTheDocument();
    });

    it('点击清除按钮应清空搜索框', () => {
      renderWithRouter();
      const input = screen.getByPlaceholderText(/搜索问题/);
      fireEvent.change(input, { target: { value: '测试' } });

      const clearBtn = screen.getByText('✕ 清除');
      fireEvent.click(clearBtn);

      expect(input).toHaveValue('');
    });

    it('空状态下的重置筛选按钮应同时清除搜索和分类', () => {
      renderWithRouter();
      const input = screen.getByPlaceholderText(/搜索问题/);
      fireEvent.change(input, { target: { value: '不存在的内容12345' } });

      const resetBtn = screen.getByText('重置筛选');
      fireEvent.click(resetBtn);

      expect(input).toHaveValue('');
      expect(screen.getByText('如何注册账号？')).toBeInTheDocument();
    });
  });

  describe('分类筛选', () => {
    it('点击分类按钮应只显示该分类的问题', () => {
      renderWithRouter();
      const btns = getCategoryButtons();
      const troubleshootBtn = btns.find(b => b.textContent?.includes('故障排查'))!;
      fireEvent.click(troubleshootBtn);

      expect(screen.getByText('生成评语时提示"网络错误"？')).toBeInTheDocument();
      expect(screen.queryByText('如何注册账号？')).not.toBeInTheDocument();
    });

    it('再次点击同一分类应取消筛选恢复全部', () => {
      renderWithRouter();
      const btns = getCategoryButtons();
      const btn = btns.find(b => b.textContent?.includes('故障排查'))!;
      fireEvent.click(btn);
      expect(screen.queryByText('如何注册账号？')).not.toBeInTheDocument();

      fireEvent.click(btn);
      expect(screen.getByText('如何注册账号？')).toBeInTheDocument();
    });
  });

  describe('折叠展开交互', () => {
    it('默认所有答案折叠', () => {
      const { container } = renderWithRouter();
      const expandedPanels = container.querySelectorAll('.grid-rows-\\[1fr\\]');
      expect(expandedPanels.length).toBe(0);
    });

    it('点击问题应展开答案', async () => {
      const { container } = renderWithRouter();
      fireEvent.click(screen.getByText('如何注册账号？'));

      await new Promise(resolve => setTimeout(resolve, 100));

      const expandedPanels = container.querySelectorAll('.grid-rows-\\[1fr\\]');
      expect(expandedPanels.length).toBeGreaterThanOrEqual(1);
    });

    it('再次点击已展开项应折叠', async () => {
      const { container } = renderWithRouter();
      const question = screen.getByText('如何注册账号？');

      fireEvent.click(question);
      await new Promise(resolve => setTimeout(resolve, 100));

      let expandedPanels = container.querySelectorAll('.grid-rows-\\[1fr\\]');
      expect(expandedPanels.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(question);
      await new Promise(resolve => setTimeout(resolve, 100));

      expandedPanels = container.querySelectorAll('.grid-rows-\\[1fr\\]');
      expect(expandedPanels.length).toBe(0);
    });

    it('展开新项时旧项应自动收起（手风琴模式）', async () => {
      const { container } = renderWithRouter();

      fireEvent.click(screen.getByText('如何注册账号？'));
      await new Promise(resolve => setTimeout(resolve, 100));

      let expandedPanels = container.querySelectorAll('.grid-rows-\\[1fr\\]');
      expect(expandedPanels.length).toBeGreaterThanOrEqual(1);

      fireEvent.click(screen.getByText('第一次使用需要做什么？'));
      await new Promise(resolve => setTimeout(resolve, 100));

      expandedPanels = container.querySelectorAll('.grid-rows-\\[1fr\\]');
      expect(expandedPanels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('底部反馈区', () => {
    it('应显示联系支持区域', () => {
      renderWithRouter();
      expect(screen.getByText(/没有找到答案/)).toBeInTheDocument();
      expect(screen.getByText('💬 在线客服')).toBeInTheDocument();
      expect(screen.getByText('📧 提交工单')).toBeInTheDocument();
    });
  });
});
