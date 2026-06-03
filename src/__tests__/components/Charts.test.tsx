
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataBarChart, BehaviorPieChart, TrendLineChart, CoverageMatrix } from '../../components/Charts';

describe('Charts Components', () => {
  describe('DataBarChart', () => {
    it('renders null when data is empty', () => {
      const { container } = render(<DataBarChart data={[]} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders bar chart container with data', () => {
      const data = [
        { name: 'A', value: 10 },
        { name: 'B', value: 20 },
        { name: 'C', value: 5 },
      ];
      const { container } = render(<DataBarChart data={data} />);
      expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('renders with single data point', () => {
      const { container } = render(
        <DataBarChart data={[{ name: 'Only', value: 99 }]} height={150} />
      );
      expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('accepts custom bar color prop without error', () => {
      const { container } = render(
        <DataBarChart data={[{ name: 'Test', value: 42 }]} barColor="#FF0000" />
      );
      expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('accepts custom height prop', () => {
      const { container } = render(
        <DataBarChart data={[{ name: 'H', value: 1 }]} height={300} />
      );
      const el = container.querySelector('.recharts-responsive-container');
      expect(el).toBeTruthy();
      expect(el?.getAttribute('style')).toContain('300');
    });
  });

  describe('BehaviorPieChart', () => {
    it('renders null when all values are zero', () => {
      const { container } = render(
        <BehaviorPieChart data={[{ name: 'a', value: 0 }, { name: 'b', value: 0 }]} />
      );
      expect(container.innerHTML).toBe('');
    });

    it('renders null when data is empty', () => {
      const { container } = render(<BehaviorPieChart data={[]} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders pie chart container with positive values', () => {
      const data = [
        { name: '表扬', value: 8 },
        { name: '提醒', value: 2 },
        { name: '惩罚', value: 1 },
      ];
      const { container } = render(<BehaviorPieChart data={data} />);
      expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('filters out zero-value items and renders', () => {
      const data = [
        { name: '表扬', value: 5 },
        { name: '提醒', value: 0 },
      ];
      const { container } = render(<BehaviorPieChart data={data} />);
      expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('TrendLineChart', () => {
    it('renders null when data is empty', () => {
      const { container } = render(<TrendLineChart data={[]} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders line chart container with data points', () => {
      const data = [
        { date: '01', value: 70 },
        { date: '02', value: 85 },
        { date: '03', value: 90 },
      ];
      const { container } = render(<TrendLineChart data={data} color="#00FF00" name="分数趋势" />);
      expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    });

    it('renders with single point', () => {
      const { container } = render(
        <TrendLineChart data={[{ date: '2025-01', value: 80 }]} />
      );
      expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
    });
  });

  describe('CoverageMatrix', () => {
    it('renders table header with dimension labels', () => {
      const students = [
        { name: '张三', coverage: { exam: true, conversation: false, homeVisit: false, behavior: false } },
      ];
      render(<CoverageMatrix students={students} />);
      expect(screen.getByText('学生')).toBeInTheDocument();
      expect(screen.getByText('📊 成绩')).toBeInTheDocument();
      expect(screen.getByText('💬 谈话')).toBeInTheDocument();
      expect(screen.getByText('🏠 家访')).toBeInTheDocument();
      expect(screen.getByText('⭐ 行为')).toBeInTheDocument();
      expect(screen.getByText('覆盖度')).toBeInTheDocument();
    });

    it('shows student names in rows', () => {
      const students = [
        { name: '李四', coverage: { exam: true, conversation: true, homeVisit: true, behavior: true } },
      ];
      render(<CoverageMatrix students={students} />);
      expect(screen.getByText('李四')).toBeInTheDocument();
    });

    it('shows correct coverage count for partial coverage', () => {
      const students = [
        { name: '王五', coverage: { exam: true, conversation: true, homeVisit: false, behavior: false } },
      ];
      render(<CoverageMatrix students={students} />);
      expect(screen.getByText('2/4')).toBeInTheDocument();
    });

    it('shows full coverage count', () => {
      const students = [
        { name: '赵六', coverage: { exam: true, conversation: true, homeVisit: true, behavior: true } },
      ];
      render(<CoverageMatrix students={students} />);
      expect(screen.getByText('4/4')).toBeInTheDocument();
    });

    it('shows zero coverage for no data student', () => {
      const students = [
        { name: '钱七', coverage: { exam: false, conversation: false, homeVisit: false, behavior: false } },
      ];
      render(<CoverageMatrix students={students} />);
      expect(screen.getByText('0/4')).toBeInTheDocument();
    });

    it('limits to 15 students and shows total count', () => {
      const students = Array.from({ length: 20 }, (_, i) => ({
        name: `学生${i + 1}`,
        coverage: { exam: i % 2 === 0, conversation: i % 3 === 0, homeVisit: i % 4 === 0, behavior: i % 5 === 0 },
      }));
      render(<CoverageMatrix students={students} />);
      expect(screen.getByText(/等共.*名/)).toBeInTheDocument();
    });

    it('renders empty state for no students', () => {
      const { container } = render(<CoverageMatrix students={[]} />);
      expect(container.innerHTML).toBe('');
    });
  });
});
