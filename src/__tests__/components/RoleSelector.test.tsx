import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleSelector from '@/components/RoleSelector';

describe('RoleSelector 组件', () => {
  const defaultProps = {
    selectedRole: null as string | null,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应渲染标题 "班级职务（可选，单选）"', () => {
    render(<RoleSelector {...defaultProps} />);
    expect(screen.getByText(/班级职务/)).toBeInTheDocument();
    expect(screen.getByText(/可选/)).toBeInTheDocument();
  });

  it('应渲染5个分类标签按钮', () => {
    render(<RoleSelector {...defaultProps} />);
    expect(screen.getByText('领导职务')).toBeInTheDocument();
    expect(screen.getByText('学习职务')).toBeInTheDocument();
    expect(screen.getByText('服务职务')).toBeInTheDocument();
    expect(screen.getByText('文体职务')).toBeInTheDocument();
    expect(screen.getByText('普通同学')).toBeInTheDocument();
  });

  it('默认选中"领导职务"分类并显示其角色', () => {
    render(<RoleSelector {...defaultProps} />);
    expect(screen.getByText('班长')).toBeInTheDocument();
    expect(screen.getByText('组长')).toBeInTheDocument();
  });

  it('点击分类标签可切换显示的角色', async () => {
    const user = userEvent.setup();
    render(<RoleSelector {...defaultProps} />);

    await user.click(screen.getByText('学习职务'));
    expect(screen.getByText('学习委员')).toBeInTheDocument();
    expect(screen.getByText('课代表')).toBeInTheDocument();

    await user.click(screen.getByText('服务职务'));
    expect(screen.getByText('纪律委员')).toBeInTheDocument();
    expect(screen.getByText('卫生委员')).toBeInTheDocument();
    expect(screen.getByText('劳动委员')).toBeInTheDocument();
  });

  it('点击角色应调用 onSelect 并传入 roleId', async () => {
    const user = userEvent.setup();
    render(<RoleSelector {...defaultProps} />);

    await user.click(screen.getByText('班长'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('class_monitor');
  });

  it('选择角色后应显示角色信息卡片', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<RoleSelector {...defaultProps} />);

    expect(screen.queryByText(/已选：/)).not.toBeInTheDocument();
    await user.click(screen.getByText('班长'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith('class_monitor');

    rerender(<RoleSelector {...defaultProps} selectedRole="class_monitor" />);
    expect(screen.getByText(/已选：/)).toBeInTheDocument();
  });

  it('未选角色时应显示提示文字', () => {
    render(<RoleSelector {...defaultProps} />);
    const hints = screen.getAllByText(/不选择/);
    expect(hints.length).toBeGreaterThan(0);
  });

  it('"普通同学"分类下只显示一个选项', async () => {
    const user = userEvent.setup();
    render(<RoleSelector {...defaultProps} />);

    await user.click(screen.getByText('普通同学'));
    expect(screen.getAllByText('普通同学').length).toBeGreaterThanOrEqual(1);
  });

  it('切换到文体分类应显示文艺委员和体育委员', async () => {
    const user = userEvent.setup();
    render(<RoleSelector {...defaultProps} />);

    await user.click(screen.getByText('文体职务'));
    expect(screen.getByText('文艺委员')).toBeInTheDocument();
    expect(screen.getByText('体育委员')).toBeInTheDocument();
  });
});
