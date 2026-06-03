import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExamAnalyzer from '../../components/ExamAnalyzer';

const mockExams = [
  {
    id: '1',
    student_id: 's001',
    exam_name: '期中考试',
    subject: '数学',
    score: 95,
    full_score: 100,
    class_avg: 82,
    class_rank: 3,
    total_count: 45,
    exam_date: '2024-11-15',
    semester: '2024-上学期',
  },
  {
    id: '2',
    student_id: 's001',
    exam_name: '期中考试',
    subject: '语文',
    score: 88,
    full_score: 100,
    class_avg: 80,
    class_rank: 8,
    total_count: 45,
    exam_date: '2024-11-15',
    semester: '2024-上学期',
  },
  {
    id: '3',
    student_id: 's001',
    exam_name: '期中考试',
    subject: '英语',
    score: 55,
    full_score: 100,
    class_avg: 70,
    class_rank: 35,
    total_count: 45,
    exam_date: '2024-11-15',
    semester: '2024-上学期',
  },
];

describe('ExamAnalyzer 组件 - 考试成绩分析', () => {

  describe('空状态渲染', () => {
    it('空数据时应显示"暂无考试成绩"空状态', () => {
      render(<ExamAnalyzer exams={[]} />);

      expect(screen.getByText('暂无考试成绩')).toBeInTheDocument();
      expect(screen.getByText('上传成绩单后可查看智能分析')).toBeInTheDocument();
    });

    it('未传入 exams 时应显示空状态', () => {
      render(<ExamAnalyzer exams={undefined as any} />);

      expect(screen.getByText('暂无考试成绩')).toBeInTheDocument();
    });

    it('空状态下应显示占位图标', () => {
      render(<ExamAnalyzer exams={[]} />);

      const icon = screen.getByText('📋');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('数据概览渲染', () => {
    it('有数据时应渲染概览统计卡片', () => {
      render(<ExamAnalyzer exams={mockExams} />);

      expect(screen.getByText('📈')).toBeInTheDocument();
      expect(screen.getByText('📉')).toBeInTheDocument();
      expect(screen.getByText('🏆')).toBeInTheDocument();
    });

    it('应显示最近平均分', () => {
      render(<ExamAnalyzer exams={mockExams} />);

      const expectedAvg = (95 + 88 + 55) / 3;
      expect(screen.getByText(`${expectedAvg.toFixed(1)}`)).toBeInTheDocument();
    });

    it('应显示最高/最低分信息', () => {
      render(<ExamAnalyzer exams={mockExams} />);

      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('55')).toBeInTheDocument();
      expect(screen.getByText('(数学)')).toBeInTheDocument();
      expect(screen.getByText('(英语)')).toBeInTheDocument();
    });

    it('应显示最佳排名', () => {
      const examsWithRank = [
        ...mockExams,
      ];

      render(<ExamAnalyzer exams={examsWithRank} />);

      expect(screen.getByText(/第.*名/)).toBeInTheDocument();
    });

    it('应显示总记录数', () => {
      render(<ExamAnalyzer exams={mockExams} />);

      expect(screen.getByText(/共 3 条记录/)).toBeInTheDocument();
    });
  });

  describe('各科目成绩展示', () => {
    it('应显示各科目的成绩条形图', () => {
      render(<ExamAnalyzer exams={mockExams} />);

      expect(screen.getByText('数学')).toBeInTheDocument();
      expect(screen.getByText('语文')).toBeInTheDocument();
      expect(screen.getByText('英语')).toBeInTheDocument();
    });

    it('应显示各科目分数', () => {
      render(<ExamAnalyzer exams={mockExams} />);

      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('88')).toBeInTheDocument();
      expect(screen.getByText('55')).toBeInTheDocument();
    });

    it('应显示满分信息', () => {
      render(<ExamAnalyzer exams={mockExams} />);

      const fullScores = screen.getAllByText('/100');
      expect(fullScores.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('compact 模式', () => {
    it('compact 模式下应隐藏标题', () => {
      render(<ExamAnalyzer exams={mockExams} compact={true} />);

      expect(screen.queryByText('成绩分析')).not.toBeInTheDocument();
    });

    it('非 compact 模式下应显示标题', () => {
      render(<ExamAnalyzer exams={mockExams} compact={false} />);

      expect(screen.getByText('成绩分析')).toBeInTheDocument();
    });

    it('compact 模式下仍应显示统计数据', () => {
      render(<ExamAnalyzer exams={mockExams} compact={true} />);

      expect(screen.getByText('95')).toBeInTheDocument();
      expect(screen.getByText('数学')).toBeInTheDocument();
    });
  });

  describe('进度条颜色逻辑', () => {
    it('分数≥90应显示绿色进度条（emerald）', () => {
      const highScoreExam = [{
        id: '1',
        student_id: 's001',
        exam_name: '期中考试',
        subject: '数学',
        score: 92,
        full_score: 100,
      }];

      render(<ExamAnalyzer exams={highScoreExam} />);

      const mathElement = screen.getByText('数学');
      expect(mathElement.className).toContain('text-emerald-600');
    });

    it('分数在70-89之间应显示黄色进度条（yellow）', () => {
      const mediumScoreExam = [{
        id: '1',
        student_id: 's001',
        exam_name: '期中考试',
        subject: '语文',
        score: 75,
        full_score: 100,
      }];

      render(<ExamAnalyzer exams={mediumScoreExam} />);

      const chineseElement = screen.getByText('语文');
      expect(chineseElement.className).toContain('text-yellow-600');
    });

    it('分数在60-69之间应显示橙色进度条（orange）', () => {
      const lowMediumScoreExam = [{
        id: '1',
        student_id: 's001',
        exam_name: '期中考试',
        subject: '英语',
        score: 65,
        full_score: 100,
      }];

      render(<ExamAnalyzer exams={lowMediumScoreExam} />);

      const englishElement = screen.getByText('英语');
      expect(englishElement.className).toContain('text-orange-600');
    });

    it('分数<60应显示红色进度条（red）', () => {
      const lowScoreExam = [{
        id: '1',
        student_id: 's001',
        exam_name: '期中考试',
        subject: '物理',
        score: 55,
        full_score: 100,
      }];

      render(<ExamAnalyzer exams={lowScoreExam} />);

      const physicsElement = screen.getByText('物理');
      expect(physicsElement.className).toContain('text-red-600');
    });
  });

  describe('趋势变化显示', () => {
    it('同科目多次考试应显示趋势箭头', () => {
      const multiExamRecords = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '月考一',
          subject: '数学',
          score: 80,
          exam_date: '2024-10-01',
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '月考二',
          subject: '数学',
          score: 85,
          exam_date: '2024-11-01',
        },
      ];

      render(<ExamAnalyzer exams={multiExamRecords} />);

      expect(screen.getByText('趋势:')).toBeInTheDocument();
    });

    it('成绩上升应显示上升箭头', () => {
      const improvedRecords = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '月考一',
          subject: '数学',
          score: 80,
          exam_date: '2024-10-01',
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '月考二',
          subject: '数学',
          score: 88,
          exam_date: '2024-11-01',
        },
      ];

      render(<ExamAnalyzer exams={improvedRecords} />);

      const { container } = render(<ExamAnalyzer exams={improvedRecords} />);
      expect(container.textContent).toContain('80→');
    });
  });

  describe('排名数据处理', () => {
    it('有排名数据时显示排名，无数据显示"暂无排名数据"', () => {
      const noRankExams = [{
        id: '1',
        student_id: 's001',
        exam_name: '期中考试',
        subject: '数学',
        score: 85,
        full_score: 100,
      }];

      render(<ExamAnalyzer exams={noRankExams} />);

      expect(screen.getByText('暂无排名数据')).toBeInTheDocument();
    });

    it('应选择最小的排名值作为最佳排名', () => {
      const multipleRankExams = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 90,
          class_rank: 5,
          total_count: 45,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '语文',
          score: 85,
          class_rank: 2,
          total_count: 45,
        },
        {
          id: '3',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '英语',
          score: 78,
          class_rank: 10,
          total_count: 45,
        },
      ];

      render(<ExamAnalyzer exams={multipleRankExams} />);

      expect(screen.getByText('第2名')).toBeInTheDocument();
    });
  });
});
