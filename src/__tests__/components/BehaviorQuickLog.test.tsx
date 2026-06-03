
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BehaviorQuickLog from '../../components/BehaviorQuickLog';

describe('BehaviorQuickLog', () => {
  const defaultProps = {
    studentId: 'student_001',
    studentName: '张三',
  };

  it('renders title and all 3 behavior type buttons', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    expect(screen.getByText('表扬')).toBeInTheDocument();
    expect(screen.getByText('提醒')).toBeInTheDocument();
    expect(screen.getByText('惩罚')).toBeInTheDocument();
  });

  it('renders all 5 category buttons', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    expect(screen.getByText((content) => content.includes('课堂表现'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('作业情况'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('活动参与'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('纪律表现'))).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('其他'))).toBeInTheDocument();
  });

  it('shows praise tags by default when type is praise', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    expect(screen.getByText('积极发言')).toBeInTheDocument();
    expect(screen.getByText('帮助同学')).toBeInTheDocument();
    expect(screen.getByText('认真听讲')).toBeInTheDocument();
  });

  it('switches to warning type and shows warning tags', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    fireEvent.click(screen.getByText('⚡'));
    expect(screen.getByText('上课走神')).toBeInTheDocument();
    expect(screen.getByText('作业迟交')).toBeInTheDocument();
    expect(screen.getByText('交头接耳')).toBeInTheDocument();
  });

  it('switches to punishment type and shows punishment tags', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    fireEvent.click(screen.getByText('🔴'));
    expect(screen.getByText('扰乱课堂')).toBeInTheDocument();
    expect(screen.getByText('欺凌同学')).toBeInTheDocument();
    expect(screen.getByText('考试作弊')).toBeInTheDocument();
  });

  it('selects a tag and enables save button', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    const tagBtn = screen.getByText('积极发言');
    fireEvent.click(tagBtn);
    const saveBtn = screen.getByText(/记录表扬/);
    expect(saveBtn).not.toBeDisabled();
  });

  it('disables save button when no tag selected', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    const saveBtn = screen.getByText(/记录表扬/);
    expect(saveBtn).toBeDisabled();
  });

  it('changes save button color based on behavior type', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    fireEvent.click(screen.getByText('⚡'));
    const saveBtn = screen.getByText(/记录提醒/);
    expect(saveBtn).toBeInTheDocument();
  });

  it('renders description input field', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    expect(screen.getByPlaceholderText('补充具体细节...')).toBeInTheDocument();
  });

  it('renders date field pre-filled', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.value).toBeTruthy();
  });

  it('renders clear and save buttons', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    expect(screen.getByText('清空')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /记录表扬/ })).toBeInTheDocument();
  });

  it('clears form when clear button clicked', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    fireEvent.click(screen.getByText('积极发言'));
    const descInput = screen.getByPlaceholderText('补充具体细节...');
    fireEvent.change(descInput, { target: { value: '测试说明' } });
    fireEvent.click(screen.getByText('清空'));
    expect((descInput as HTMLInputElement).value).toBe('');
  });

  it('switching type clears selected tag', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    fireEvent.click(screen.getByText('积极发言'));
    fireEvent.click(screen.getByText('⚡'));
    const saveBtn = screen.getByText(/记录提醒/);
    expect(saveBtn).toBeDisabled();
  });

  it('has correct default type selected (praise)', () => {
    render(<BehaviorQuickLog {...defaultProps} />);
    const typeButtons = screen.getAllByRole('button');
    const praiseBtn = typeButtons.find(b => b.textContent?.includes('表扬'));
    expect(praiseBtn).toBeTruthy();
  });
});
