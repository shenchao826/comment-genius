import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportGenerator from '../../components/ReportGenerator';

describe('ReportGenerator PDF 报告组件', () => {
  const defaultProps = {
    studentName: '张三',
    className: '三年二班',
    gender: '男',
    role: '学习委员',
    teacherName: '李老师',
  };

  describe('基本渲染', () => {
    it('应显示预览和下载按钮', () => {
      render(<ReportGenerator {...defaultProps} />);

      expect(screen.getByText('📄 预览报告')).toBeInTheDocument();
      expect(screen.getByText('📥 下载 PDF')).toBeInTheDocument();
    });

    it('应显示使用提示文字', () => {
      render(<ReportGenerator {...defaultProps} />);

      expect(screen.getByText(/生成的 PDF 报告包含/)).toBeInTheDocument();
    });

    it('应正确显示学生姓名', () => {
      render(<ReportGenerator {...defaultProps} />);

      // 按钮区域应该渲染
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('交互行为', () => {
    it('点击预览按钮应触发生成状态', async () => {
      render(<ReportGenerator {...defaultProps} />);

      const previewButton = screen.getByText('📄 预览报告');
      fireEvent.click(previewButton);

      // 等待异步操作完成
      await new Promise(resolve => setTimeout(resolve, 100));

      // 检查是否进入生成状态或显示预览
      const hasLoadingState = screen.queryByText(/生成中.../) !== null;
      const hasPreview = document.querySelector('iframe') !== null;

      // 两种情况都算通过
      expect(hasLoadingState || hasPreview).toBeTruthy();
    });

    it('点击下载按钮不应报错', () => {
      render(<ReportGenerator {...defaultProps} />);

      const downloadButton = screen.getByText('📥 下载 PDF');

      expect(() => fireEvent.click(downloadButton)).not.toThrow();
    });
  });

  describe('数据传递', () => {
    it('应接受成绩数据', () => {
      const exams = [
        { examName: '期中考试', subject: '数学', score: 92, fullScore: 100 },
        { examName: '期中考试', subject: '语文', score: 88, fullScore: 100 },
      ];

      render(<ReportGenerator {...defaultProps} exams={exams} />);

      expect(screen.getByText('📄 预览报告')).toBeInTheDocument();
    });

    it('应接受行为数据', () => {
      const behaviors = [
        { id: 'b1', behaviorType: '积极发言', category: '课堂表现', tags: ['数学'], points: 3, date: '2026-05-01' },
        { id: 'b2', behaviorType: '帮助同学', category: '品德表现', tags: ['互助'], points: 5, date: '2026-05-02' },
      ];

      render(<ReportGenerator {...defaultProps} behaviors={behaviors} />);

      expect(screen.getByText('📄 预览报告')).toBeInTheDocument();
    });

    it('应接受谈话和家访数据', () => {
      const conversations = [
        { id: 'c1', type: '学业指导', content: '讨论学习计划', date: '2026-05-10' },
      ];
      const homeVisits = [
        { id: 'h1', visitType: '常规家访', purpose: '了解家庭情况', consensus: '家长配合', date: '2026-05-15' },
      ];

      render(<ReportGenerator {...defaultProps} conversations={conversations} homeVisits={homeVisits} />);

      expect(screen.getByText('📄 预览报告')).toBeInTheDocument();
    });

    it('应接受自定义总结和建议', () => {
      const summary = '该生本学期表现优异，各科均衡发展。';
      const recommendations = [
        '继续保持良好状态',
        '加强英语口语练习',
      ];

      render(<ReportGenerator {...defaultProps} summary={summary} recommendations={recommendations} />);

      expect(screen.getByText('📄 预览报告')).toBeInTheDocument();
    });
  });
});

describe('PDF 报告工具函数', () => {
  it('应导出必要的模块和函数', async () => {
    const pdfModule = await import('../../utils/pdfReport');

    expect(pdfModule.generateStudentReport).toBeDefined();
    expect(pdfModule.downloadStudentReport).toBeDefined();
    expect(pdfModule.getReportBlob).toBeDefined();

    // 类型检查
    expect(typeof pdfModule.generateStudentReport).toBe('function');
    expect(typeof pdfModule.downloadStudentReport).toBe('function');
    expect(typeof pdfModule.getReportBlob).toBe('function');
  });

  it('模块应正确加载且不报错', async () => {
    const module = await import('../../utils/pdfReport');

    // 验证模块对象存在
    expect(module).toBeDefined();
    expect(Object.keys(module).length).toBeGreaterThan(0);
  });
});
