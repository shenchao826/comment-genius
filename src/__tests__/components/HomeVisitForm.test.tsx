
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HomeVisitForm from '../../components/HomeVisitForm';

describe('HomeVisitForm', () => {
  const defaultProps = {
    studentId: 'student_002',
    studentName: '李四',
  };

  it('renders title and all 4 visit type buttons', () => {
    render(<HomeVisitForm {...defaultProps} />);
    expect(screen.getByText('🏠')).toBeInTheDocument();
    expect(screen.getByText('上门家访')).toBeInTheDocument();
    expect(screen.getByText('电话家访')).toBeInTheDocument();
    expect(screen.getByText('视频家访')).toBeInTheDocument();
    expect(screen.getByText('到校面谈')).toBeInTheDocument();
  });

  it('renders form fields: purpose, date, family structure, topics, consensus, plan', () => {
    render(<HomeVisitForm {...defaultProps} />);
    expect(screen.getByPlaceholderText(/如：了解家庭环境/)).toBeInTheDocument();
    expect(screen.getByText('家访日期 *')).toBeDefined();
    expect(screen.getByPlaceholderText(/如：与父母同住/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/讨论的主要话题/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/与家长达成的共识或约定/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/后续跟进措施/)).toBeInTheDocument();
  });

  it('switches type and updates placeholder', () => {
    render(<HomeVisitForm {...defaultProps} />);
    fireEvent.click(screen.getByText('电话家访'));
    expect(screen.getByPlaceholderText(/如：反馈近期表现/)).toBeInTheDocument();
  });

  it('shows phone template hints when phone type selected', () => {
    render(<HomeVisitForm {...defaultProps} />);
    fireEvent.click(screen.getByText('📞'));
    expect(screen.getByText('+成绩波动').textContent).toBeTruthy();
  });

  it('shows video template hints when video type selected', () => {
    render(<HomeVisitForm {...defaultProps} />);
    fireEvent.click(screen.getByText('📹'));
    expect(screen.getByText('+线上学习效果').textContent).toBeTruthy();
  });

  it('shows school meeting template hints when school_meeting type selected', () => {
    render(<HomeVisitForm {...defaultProps} />);
    fireEvent.click(screen.getByText('🏫'));
    expect(screen.getByText('+升学规划').textContent).toBeTruthy();
  });

  it('shows in_person topic suggestions by default', () => {
    render(<HomeVisitForm {...defaultProps} />);
    expect(screen.getByText('+学习习惯').textContent).toBeTruthy();
    expect(screen.getByText('+作息规律').textContent).toBeTruthy();
  });

  it('disables save button when purpose is empty', () => {
    render(<HomeVisitForm {...defaultProps} />);
    const saveBtn = screen.getByText('💾 保存记录');
    expect(saveBtn).toBeDisabled();
  });

  it('enables save button when purpose is filled', () => {
    render(<HomeVisitForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/如：了解家庭环境/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '了解学生在家情况' } });
    const saveBtn = screen.getByText('💾 保存记录');
    expect(saveBtn).not.toBeDisabled();
  });

  it('renders save and clear buttons', () => {
    render(<HomeVisitForm {...defaultProps} />);
    expect(screen.getByText('清空')).toBeInTheDocument();
    expect(screen.getByText('💾 保存记录')).toBeInTheDocument();
  });

  it('has date field pre-filled', () => {
    render(<HomeVisitForm {...defaultProps} />);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.value).toBeTruthy();
  });

  it('shows consensus hint buttons for in_person type', () => {
    render(<HomeVisitForm {...defaultProps} />);
    expect(screen.getByText('+保持每日阅读30分钟').textContent).toBeTruthy();
  });

  it('clears form when clear button clicked', () => {
    render(<HomeVisitForm {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/如：了解家庭环境/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'some purpose' } });
    fireEvent.click(screen.getByText('清空'));
    expect((textarea as HTMLTextAreaElement).value).toBe('');
  });
});
