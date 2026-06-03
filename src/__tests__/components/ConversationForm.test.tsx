
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConversationForm from '../../components/ConversationForm';

describe('ConversationForm', () => {
  const defaultProps = {
    studentId: 'student_001',
    studentName: '张三',
  };

  it('renders title and all 5 conversation type buttons', () => {
    render(<ConversationForm {...defaultProps} />);
    expect(screen.getByText('💬')).toBeInTheDocument();
    expect(screen.getByText('日常沟通')).toBeInTheDocument();
    expect(screen.getByText('纪律谈话')).toBeInTheDocument();
    expect(screen.getByText('表扬鼓励')).toBeInTheDocument();
    expect(screen.getByText('心理疏导')).toBeInTheDocument();
    expect(screen.getByText('目标规划')).toBeInTheDocument();
  });

  it('renders form fields: category, date, content, reaction, follow-up', () => {
    render(<ConversationForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/如：学习态度/)).toBeInTheDocument();
    expect(screen.getByText('谈话日期 *')).toBeDefined();
    expect(screen.getByPlaceholderText(/记录日常交流内容/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/描述学生在谈话中的反应/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/计划采取的后续行动/)).toBeInTheDocument();
  });

  it('switches type and updates placeholder text', () => {
    render(<ConversationForm {...defaultProps} />);
    fireEvent.click(screen.getByText('纪律谈话'));
    expect(screen.getByPlaceholderText(/记录纪律问题及谈话要点/)).toBeInTheDocument();
  });

  it('shows discipline placeholder when discipline type selected', () => {
    render(<ConversationForm {...defaultProps} />);
    fireEvent.click(screen.getByText('⚠️'));
    const textarea = screen.getByPlaceholderText(/记录纪律问题/) as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
  });

  it('shows praise placeholder when praise type selected', () => {
    render(<ConversationForm {...defaultProps} />);
    fireEvent.click(screen.getByText('🌟'));
    expect(screen.getByPlaceholderText(/记录表扬鼓励的内容/)).toBeInTheDocument();
  });

  it('shows psychological placeholder when psychological type selected', () => {
    render(<ConversationForm {...defaultProps} />);
    fireEvent.click(screen.getByText('💚'));
    expect(screen.getByPlaceholderText(/记录心理疏导内容/)).toBeInTheDocument();
  });

  it('shows goal placeholder when goal type selected', () => {
    render(<ConversationForm {...defaultProps} />);
    fireEvent.click(screen.getByText('🎯'));
    expect(screen.getByPlaceholderText(/记录目标规划内容/)).toBeInTheDocument();
  });

  it('renders save and clear buttons', () => {
    render(<ConversationForm {...defaultProps} />);
    expect(screen.getByText('清空')).toBeInTheDocument();
    expect(screen.getByText('💾 保存记录')).toBeInTheDocument();
  });

  it('disables save button when content is empty', () => {
    render(<ConversationForm {...defaultProps} />);
    const saveBtn = screen.getByText('💾 保存记录');
    expect(saveBtn).toBeDisabled();
  });

  it('enables save button when content is filled', () => {
    render(<ConversationForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/记录日常交流内容/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '测试谈话内容' } });
    const saveBtn = screen.getByText('💾 保存记录');
    expect(saveBtn).not.toBeDisabled();
  });

  it('has date field pre-filled with today', () => {
    render(<ConversationForm {...defaultProps} />);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.value).toBeTruthy();
  });

  it('shows reaction hint buttons for daily type', () => {
    render(<ConversationForm {...defaultProps} />);
    expect(screen.getByText('+积极回应').textContent).toBeTruthy();
  });

  it('clears form when clear button clicked', () => {
    render(<ConversationForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/记录日常交流内容/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'some content' } });
    fireEvent.click(screen.getByText('清空'));
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });
});
