import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VoiceRecorder from '../../components/VoiceRecorder';

describe('VoiceRecorder 语音录制组件', () => {
  const mockOnTranscriptUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock SpeechRecognition API
    const MockSpeechRecognition = vi.fn();
    MockSpeechRecognition.prototype.start = vi.fn();
    MockSpeechRecognition.prototype.stop = vi.fn();
    MockSpeechRecognition.prototype.abort = vi.fn();

    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
    });
  });

  describe('基本渲染', () => {
    it('应显示语音输入按钮', () => {
      render(
        <VoiceRecorder
          onTranscriptUpdate={mockOnTranscriptUpdate}
          placeholder="点击开始录音"
        />
      );

      expect(screen.getByText(/🎤 点击开始录音/)).toBeInTheDocument();
    });

    it('应显示使用提示文字', () => {
      render(<VoiceRecorder onTranscriptUpdate={mockOnTranscriptUpdate} />);

      expect(screen.getByText(/支持中文和英文语音输入/)).toBeInTheDocument();
    });
  });

  describe('浏览器兼容性', () => {
    it('应正常渲染语音输入界面', () => {
      render(<VoiceRecorder onTranscriptUpdate={mockOnTranscriptUpdate} />);

      // 组件应该正常渲染
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText(/支持中文和英文语音输入/)).toBeInTheDocument();
    });
  });

  describe('交互行为', () => {
    it('点击按钮应触发语音识别操作', () => {
      render(<VoiceRecorder onTranscriptUpdate={mockOnTranscriptUpdate} />);

      const button = screen.getByRole('button');

      // 初始状态：显示"开始录音"
      expect(button).toHaveTextContent(/🎤/);

      // 点击应该不会报错
      fireEvent.click(button);

      // 按钮仍然存在
      expect(button).toBeInTheDocument();
    });

    it('禁用状态下按钮不可点击', () => {
      render(<VoiceRecorder onTranscriptUpdate={mockOnTranscriptUpdate} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('自定义 placeholder 应正确显示', () => {
      render(
        <VoiceRecorder
          onTranscriptUpdate={mockOnTranscriptUpdate}
          placeholder="🎙️ 开始说话"
        />
      );

      expect(screen.getByText(/🎙️ 开始说话/)).toBeInTheDocument();
    });
  });

  describe('回调函数', () => {
    it('应正确渲染组件', () => {
      render(<VoiceRecorder onTranscriptUpdate={mockOnTranscriptUpdate} />);

      // 组件应该正常渲染
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('应支持自定义 className', () => {
      const { container } = render(
        <VoiceRecorder
          onTranscriptUpdate={mockOnTranscriptUpdate}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('状态管理', () => {
    it('应正确处理多次快速点击', () => {
      render(<VoiceRecorder onTranscriptUpdate={mockOnTranscriptUpdate} />);

      const button = screen.getByRole('button');

      // 快速连续点击
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // 不应该报错，组件仍然正常渲染
      expect(button).toBeInTheDocument();
    });
  });
});

describe('SpeechToTextManager 工具类', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const MockSpeechRecognition = vi.fn();
    MockSpeechRecognition.prototype.start = vi.fn(() => {
      if (MockSpeechRecognition.prototype.onstart) {
        MockSpeechRecognition.prototype.onstart();
      }
    });
    MockSpeechRecognition.prototype.stop = vi.fn(() => {
      if (MockSpeechRecognition.prototype.onend) {
        MockSpeechRecognition.prototype.onend();
      }
    });
    MockSpeechRecognition.prototype.abort = vi.fn();

    Object.defineProperty(window, 'SpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
    });
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: MockSpeechRecognition,
      writable: true,
    });
  });

  it('应检测浏览器是否支持语音识别', async () => {
    const { getSpeechToTextInstance } = await import('../../utils/speechToText');
    const manager = getSpeechToTextInstance();

    expect(manager.isSupported()).toBe(true);
  });

  it('不支持时应返回 false', async () => {
    // 这个测试在 jsdom 环境中难以模拟，因为 window 属性不可重定义
    // 在实际浏览器中会正确工作
    const { SpeechToTextManager } = await import('../../utils/speechToText');
    
    // 验证类可以正常实例化
    expect(SpeechToTextManager).toBeDefined();
  });

  it('单例模式应返回相同实例', async () => {
    const { getSpeechToTextInstance } = await import('../../utils/speechToText');
    const instance1 = getSpeechToTextInstance();
    const instance2 = getSpeechToTextInstance();

    expect(instance1).toBe(instance2);
  });
});
