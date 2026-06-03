
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DataTimeline, { buildTimelineFromData } from '../../components/DataTimeline';

describe('DataTimeline', () => {
  it('renders empty state when no items', () => {
    render(<DataTimeline items={[]} />);
    expect(screen.getByText('暂无记录')).toBeInTheDocument();
  });

  it('renders empty state when items is undefined', () => {
    render(<DataTimeline />);
    expect(screen.getByText('暂无记录')).toBeInTheDocument();
  });

  it('renders exam timeline item correctly', () => {
    const items = [{
      id: 'exam-1',
      type: 'exam' as const,
      date: '2025-03-15',
      title: '期中考试 · 数学',
      subtitle: '92/100 第3名',
      detail: '分数：92，满分：100',
      meta: '数学',
      colorClass: 'text-blue-600',
      icon: '📊',
    }];
    render(<DataTimeline items={items} />);
    expect(screen.getByText('期中考试 · 数学')).toBeInTheDocument();
    expect(screen.getByText('92/100 第3名')).toBeInTheDocument();
  });

  it('renders conversation timeline item correctly', () => {
    const items = [{
      id: 'conv-1',
      type: 'conversation' as const,
      date: '2025-03-20',
      title: '日常沟通',
      detail: '今天和张三聊了学习情况',
      meta: '学习',
      colorClass: 'text-teal-600',
      icon: '💬',
    }];
    render(<DataTimeline items={items} />);
    expect(screen.getByText('日常沟通')).toBeInTheDocument();
  });

  it('renders homevisit timeline item correctly', () => {
    const items = [{
      id: 'visit-1',
      type: 'homevisit' as const,
      date: '2025-04-01',
      title: '上门家访',
      detail: '了解家庭情况',
      colorClass: 'text-indigo-600',
      icon: '🏠',
    }];
    render(<DataTimeline items={items} />);
    expect(screen.getByText('上门家访')).toBeInTheDocument();
  });

  it('renders behavior timeline item correctly', () => {
    const items = [{
      id: 'beh-1',
      type: 'behavior' as const,
      date: '2025-04-10',
      title: '表扬 · 积极发言',
      detail: '课堂上积极举手回答问题',
      meta: '+1',
      colorClass: 'text-purple-600',
      icon: '🌟',
    }];
    render(<DataTimeline items={items} />);
    expect(screen.getByText('表扬 · 积极发言')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('groups items by month in full mode', () => {
    const items = [
      { id: '1', type: 'exam' as const, date: '2025-03-15', title: '考试A', detail: '', icon: '📊', colorClass: '' },
      { id: '2', type: 'exam' as const, date: '2025-03-20', title: '考试B', detail: '', icon: '📊', colorClass: '' },
      { id: '3', type: 'conversation' as const, date: '2025-04-05', title: '谈话', detail: '', icon: '💬', colorClass: '' },
    ];
    render(<DataTimeline items={items} compact={false} />);
    const monthHeaders = screen.getAllByText((content) => content.includes('2025-03') || content.includes('2025-04'));
    expect(monthHeaders.length).toBeGreaterThanOrEqual(2);
    const headerTexts = monthHeaders.map(el => el.textContent);
    expect(headerTexts.some(t => t?.includes('2025-03'))).toBe(true);
    expect(headerTexts.some(t => t?.includes('2025-04'))).toBe(true);
  });

  it('limits to 8 items in compact mode', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `item-${i}`,
      type: 'exam' as const,
      date: `2025-${String(Math.floor(i / 3) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      title: `考试${i}`,
      detail: '',
      icon: '📊',
      colorClass: '',
    }));
    render(<DataTimeline items={items} compact={true} />);
    expect(screen.getByText(/查看全部 12 条记录/)).toBeInTheDocument();
  });

  it('does not show "view all" when items <= 8 in compact mode', () => {
    const items = Array.from({ length: 6 }, (_, i) => ({
      id: `item-${i}`,
      type: 'exam' as const,
      date: `2025-03-${String(i + 1).padStart(2, '0')}`,
      title: `考试${i}`,
      detail: '',
      icon: '📊',
      colorClass: '',
    }));
    render(<DataTimeline items={items} compact={true} />);
    expect(screen.queryByText(/查看全部/)).not.toBeInTheDocument();
  });

  it('sorts items by date descending', () => {
    const items = [
      { id: '1', type: 'exam' as const, date: '2025-01-01', title: '旧', detail: '', icon: '📊', colorClass: '' },
      { id: '2', type: 'exam' as const, date: '2025-06-30', title: '新', detail: '', icon: '📊', colorClass: '' },
    ];
    render(<DataTimeline items={items} />);
    const textElements = screen.getAllByText(/^新$|^旧$/);
    expect(textElements[0].textContent).toBe('新');
  });
});

describe('buildTimelineFromData', () => {
  it('converts exam data to timeline items', () => {
    const exams = [{ id: 'e1', exam_name: '期中', subject: '数学', score: 90, full_score: 100, class_rank: 3, exam_date: '2025-03-15' }];
    const result = buildTimelineFromData(exams, [], [], []);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('exam');
    expect(result[0].title).toContain('期中');
    expect(result[0].icon).toBe('📊');
  });

  it('converts conversation data to timeline items', () => {
    const conversations = [{ id: 'c1', conversation_type: 'daily', content: '聊天内容', conversation_date: '2025-04-01' }];
    const result = buildTimelineFromData([], conversations, [], []);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('conversation');
    expect(result[0].icon).toBe('💬');
  });

  it('converts home visit data to timeline items', () => {
    const homeVisits = [{ id: 'v1', visit_type: 'in_person', visit_purpose: '了解家庭', visit_date: '2025-05-01' }];
    const result = buildTimelineFromData([], [], homeVisits, []);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('homevisit');
    expect(result[0].icon).toBe('🏠');
  });

  it('converts behavior data to timeline items', () => {
    const behaviors = [{ id: 'b1', behavior_type: 'praise', behavior_tag: '积极发言', points: 1, record_date: '2025-06-01' }];
    const result = buildTimelineFromData([], [], [], behaviors);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('behavior');
    expect(result[0].icon).toBe('🌟');
    expect(result[0].meta).toBe('+1');
  });

  it('handles punishment behavior with negative points', () => {
    const behaviors = [{ id: 'b1', behavior_type: 'punishment', behavior_tag: '扰乱课堂', points: -2, record_date: '2025-06-01' }];
    const result = buildTimelineFromData([], [], [], behaviors);
    expect(result[0].meta).toBe('-2');
    expect(result[0].icon).toBe('🔴');
  });

  it('handles warning behavior with correct icon', () => {
    const behaviors = [{ id: 'b1', behavior_type: 'warning', behavior_tag: '上课走神', points: -1, record_date: '2025-06-01' }];
    const result = buildTimelineFromData([], [], [], behaviors);
    expect(result[0].icon).toBe('⚡');
  });

  it('returns empty array for all empty inputs', () => {
    const result = buildTimelineFromData([], [], [], []);
    expect(result).toHaveLength(0);
  });

  it('merges all 4 data types into unified timeline', () => {
    const exams = [{ id: 'e1', exam_name: '期末', subject: '语文', score: 85, full_score: 100, exam_date: '2025-06-20' }];
    const conversations = [{ id: 'c1', conversation_type: 'praise', content: '表扬', conversation_date: '2025-06-18' }];
    const homeVisits = [{ id: 'v1', visit_type: 'phone', visit_purpose: '电话沟通', visit_date: '2025-06-19' }];
    const behaviors = [{ id: 'b1', behavior_type: 'praise', behavior_tag: '帮助同学', points: 1, record_date: '2025-06-21' }];
    const result = buildTimelineFromData(exams, conversations, homeVisits, behaviors);
    expect(result).toHaveLength(4);
    const types = result.map(r => r.type);
    expect(types).toContain('exam');
    expect(types).toContain('conversation');
    expect(types).toContain('homevisit');
    expect(types).toContain('behavior');
  });

  it('sorts results by date descending', () => {
    const behaviors = [
      { id: 'b1', behavior_type: 'praise', behavior_tag: '旧', record_date: '2025-01-01' },
      { id: 'b2', behavior_type: 'praise', behavior_tag: '新', record_date: '2025-12-31' },
    ];
    const result = buildTimelineFromData([], [], [], behaviors);
    expect(result[0].title).toContain('新');
    expect(result[1].title).toContain('旧');
  });
});
