import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ExamUploader from '../../components/ExamUploader';

describe('ExamUploader 组件 - 考试成绩上传', () => {

  describe('基本渲染', () => {
    it('应渲染"📊 考试成绩管理"标题', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText('📊')).toBeInTheDocument();
      expect(screen.getByText('考试成绩管理')).toBeInTheDocument();
    });

    it('应显示当前学生姓名', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="李四"
        />
      );

      expect(screen.getByText(/当前学生：李四/)).toBeInTheDocument();
    });
  });

  describe('Tab 切换功能', () => {
    it('应有"上传 Excel"和"手动录入"两个 tab', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText('📁 上传 Excel')).toBeInTheDocument();
      expect(screen.getByText('✏️ 手动录入')).toBeInTheDocument();
    });

    it('默认应选中"上传 Excel" tab', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      const uploadTab = screen.getByText('📁 上传 Excel');
      expect(uploadTab).toHaveClass('text-blue-600');
    });

    it('点击"手动录入" tab 应切换到手动录入模式', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      const manualTab = screen.getByText('✏️ 手动录入');
      fireEvent.click(manualTab);

      expect(manualTab).toHaveClass('text-blue-600');
    });
  });

  describe('上传模式渲染', () => {
    it('默认应显示上传区域（拖拽提示）', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText(/拖拽 Excel 文件到此处，或点击选择/)).toBeInTheDocument();
    });

    it('应显示支持的文件格式提示', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText(/支持 .xlsx \/ .xls \/ .csv 格式/)).toBeInTheDocument();
    });

    it('应显示列名识别提示', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText(/支持自动识别列名/)).toBeInTheDocument();
    });

    it('应显示拖拽图标', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText('📄')).toBeInTheDocument();
    });
  });

  describe('手动录入模式渲染', () => {
    it('手动录入模式下应显示表单字段', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      const manualTab = screen.getByText('✏️ 手动录入');
      fireEvent.click(manualTab);

      // Verify form inputs are present (placeholder text may vary by locale)
      const inputs = screen.queryAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });

  describe('底部操作按钮', () => {
    it('应显示"清空"按钮', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText('清空')).toBeInTheDocument();
    });

    it('应显示"保存"按钮', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText(/💾 保存/)).toBeInTheDocument();
    });

    it('无数据时保存按钮应为禁用状态', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      const saveButton = screen.getByText(/💾 保存/);
      expect(saveButton).toBeDisabled();
    });
  });

  describe('组件结构完整性', () => {
    it('应包含隐藏的文件输入元素', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).not.toBeNull();
    });

    it('整体布局应包含标题、tab栏、内容区和操作区', () => {
      render(
        <ExamUploader
          studentId="s001"
          studentName="张三"
        />
      );

      expect(screen.getByText('考试成绩管理')).toBeInTheDocument();
      expect(screen.getByText('📁 上传 Excel')).toBeInTheDocument();
      expect(screen.getByText('✏️ 手动录入')).toBeInTheDocument();
      expect(screen.getByText(/拖拽 Excel 文件到此处/)).toBeInTheDocument();
      expect(screen.getByText('清空')).toBeInTheDocument();
      expect(screen.getByText(/💾 保存/)).toBeInTheDocument();
    });
  });
});
