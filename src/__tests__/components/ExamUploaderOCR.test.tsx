import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ExamUploader from '../../components/ExamUploader';

vi.mock('../../utils/apiClient', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
  },
  uploadFile: vi.fn(),
}));

import { uploadFile } from '../../utils/apiClient';
const mockedUploadFile = vi.mocked(uploadFile);

describe('ExamUploader - OCR 功能', () => {
  const mockOnSaveComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'test_token');
  });

  afterEach(() => {
    localStorage.removeItem('auth_token');
  });

  describe('OCR Tab 渲染', () => {
    it('应显示三个 Tab：上传Excel、手动录入、拍照识别', () => {
      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      expect(screen.getByText('📁 上传 Excel')).toBeInTheDocument();
      expect(screen.getByText('✏️ 手动录入')).toBeInTheDocument();
      expect(screen.getByText('📷 拍照识别')).toBeInTheDocument();
    });

    it('默认显示上传 Excel Tab', () => {
      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      expect(screen.getByText(/拖拽 Excel 文件到此处/)).toBeInTheDocument();
    });

    it('点击"拍照识别"Tab 应切换到 OCR 模式', () => {
      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));

      expect(screen.getByText(/点击选择或拍摄成绩单图片/)).toBeInTheDocument();
      expect(screen.getByText(/支持 JPG \/ PNG \/ WebP 格式/)).toBeInTheDocument();
    });
  });

  describe('OCR 图片选择', () => {
    it('应支持选择图片文件', async () => {
      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      // 切换到 OCR Tab
      fireEvent.click(screen.getByText('📷 拍照识别'));

      // 创建测试图片文件
      const testImageFile = new File(['test-image-content'], 'test-exam.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');

      if (input) {
        fireEvent.change(input, { target: { files: [testImageFile] } });

        await waitFor(() => {
          expect(screen.getByAltText('成绩单预览')).toBeInTheDocument();
        });
      }
    });
  });

  describe('OCR 识别流程', () => {
    it('点击"开始AI识别"按钮应调用 OCR API', async () => {
      mockedUploadFile.mockResolvedValueOnce({
        data: {
          success: true,
          count: 2,
          records: [
            { id: 'ocr_test_1', examName: '期中考试', subject: '数学', score: 92, fullScore: 100, classAvg: 85.5, rank: 3 },
            { id: 'ocr_test_2', examName: '期中考试', subject: '语文', score: 88, fullScore: 100, classAvg: null, rank: null },
          ],
        },
        status: 200,
        ok: true,
        headers: new Headers(),
      });

      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));

      const testImageFile = new File(['test'], 'exam.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) {
        fireEvent.change(input, { target: { files: [testImageFile] } });
      }

      await waitFor(() => {
        expect(screen.getByAltText('成绩单预览')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('🔍 开始AI识别'));

      await waitFor(() => {
        expect(mockedUploadFile).toHaveBeenCalledWith(
          '/api/ocr/exam',
          expect.any(File),
          'image',
        );
      });
    });

    it('OCR 成功后应在数据预览区显示识别结果', async () => {
      mockedUploadFile.mockResolvedValueOnce({
        data: {
          success: true,
          count: 1,
          records: [
            { id: 'ocr_success_1', examName: '期末考试', subject: '英语', score: 95, fullScore: 100, classAvg: 88, rank: 1 },
          ],
        },
        status: 200,
        ok: true,
        headers: new Headers(),
      });

      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));
      const testFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) fireEvent.change(input, { target: { files: [testFile] } });

      await waitFor(() => expect(screen.getByAltText('成绩单预览')).toBeInTheDocument());
      fireEvent.click(screen.getByText('🔍 开始AI识别'));

      await new Promise(resolve => setTimeout(resolve, 0));

      expect(screen.getByText(/成功识别/)).toBeInTheDocument();
    });

    it('OCR 失败时应显示错误信息', async () => {
      mockedUploadFile.mockResolvedValueOnce({
        data: { error: '未能从图片中提取到有效数据' },
        status: 422,
        ok: false,
        headers: new Headers(),
      });

      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));
      const testFile = new File(['img'], 'bad.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) fireEvent.change(input, { target: { files: [testFile] } });

      await waitFor(() => expect(screen.getByAltText('成绩单预览')).toBeInTheDocument());
      fireEvent.click(screen.getByText('🔍 开始AI识别'));

      await waitFor(() => {
        expect(screen.getByText(/未能从图片中提取到有效数据/)).toBeInTheDocument();
      });
    });

    it('未登录时 OCR 应提示错误', async () => {
      localStorage.removeItem('auth_token');

      mockedUploadFile.mockRejectedValueOnce(Object.assign(new Error('上传失败'), { code: 'UPLOAD_ERROR', isNetworkError: true }));

      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));
      const testFile = new File(['img'], 'exam.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) fireEvent.change(input, { target: { files: [testFile] } });

      await waitFor(() => expect(screen.getByAltText('成绩单预览')).toBeInTheDocument());
      fireEvent.click(screen.getByText('🔍 开始AI识别'));

      await waitFor(() => {
        expect(screen.getByText(/上传失败|识别失败/)).toBeInTheDocument();
      });
    });
  });

  describe('OCR UI 交互', () => {
    it('清除图片按钮应重置 OCR 状态', async () => {
      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));
      const testFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) fireEvent.change(input, { target: { files: [testFile] } });

      await waitFor(() => expect(screen.getByAltText('成绩单预览')).toBeInTheDocument());

      // 点击清除按钮
      const clearButton = screen.getByTitle('清除图片');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByAltText('成绩单预览')).not.toBeInTheDocument();
        expect(screen.getByText(/点击选择或拍摄成绩单图片/)).toBeInTheDocument();
      });
    });

    it('"重新选择"按钮应清除当前图片', async () => {
      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));
      const testFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) fireEvent.change(input, { target: { files: [testFile] } });

      await waitFor(() => expect(screen.getByAltText('成绩单预览')).toBeInTheDocument());
      fireEvent.click(screen.getByText('重新选择'));

      expect(screen.queryByAltText('成绩单预览')).not.toBeInTheDocument();
    });

    it('处理中状态应禁用按钮', async () => {
      let resolvePromise: (value: any) => void;
      mockedUploadFile.mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolvePromise = resolve;
          })
      );

      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));
      const testFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) fireEvent.change(input, { target: { files: [testFile] } });

      await waitFor(() => expect(screen.getByAltText('成绩单预览')).toBeInTheDocument());
      fireEvent.click(screen.getByText('🔍 开始AI识别'));

      expect(screen.getByText('⏳ AI正在识别...')).toBeInTheDocument();

      if (resolvePromise) {
        resolvePromise({
          data: { success: true, count: 0, records: [] },
          status: 200,
          ok: true,
          headers: new Headers(),
        });
      }
    });
  });

  describe('使用提示', () => {
    it('OCR Tab 应显示使用技巧提示（在选择图片后）', async () => {
      render(<ExamUploader studentId="student_1" studentName="张三" onSaveComplete={mockOnSaveComplete} />);

      fireEvent.click(screen.getByText('📷 拍照识别'));

      // 先上传一张图片以显示完整UI
      const testFile = new File(['img'], 'photo.jpg', { type: 'image/jpeg' });
      const input = document.querySelector('input[type="file"][accept*="image"]');
      if (input) fireEvent.change(input, { target: { files: [testFile] } });

      await waitFor(() => {
        expect(screen.getByText(/使用技巧/)).toBeInTheDocument();
        expect(screen.getByText(/确保照片清晰/)).toBeInTheDocument();
        expect(screen.getByText(/避免反光和阴影/)).toBeInTheDocument();
      });
    });
  });
});
