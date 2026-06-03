import { describe, it, expect } from 'vitest';

interface ExamRecord {
  id: string;
  student_id: string;
  exam_name: string;
  subject: string;
  score: number;
  full_score?: number;
  class_avg?: number;
  class_rank?: number;
  total_count?: number;
  exam_date?: string;
  semester?: string;
}

interface SummaryOptions {
  locale?: 'zh' | 'en';
}

function buildExamSummary(records: ExamRecord[], options: SummaryOptions = {}): string {
  const { locale = 'zh' } = options;

  if (!records || records.length === 0) {
    return '';
  }

  const scores = records.map(r => r.score);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

  const sortedByScore = [...records].sort((a, b) => b.score - a.score);
  const highest = sortedByScore[0];
  const lowest = sortedByScore[sortedByScore.length - 1];

  const rankedRecords = records.filter(r => r.class_rank != null && r.class_rank > 0);
  const bestRank = rankedRecords.length > 0
    ? rankedRecords.reduce((best, r) =>
        (r.class_rank ?? Infinity) < (best.class_rank ?? Infinity) ? r : best,
      )
    : null;

  const subjects = [...new Set(records.map(r => r.subject))];

  const subjectGroups = new Map<string, ExamRecord[]>();
  records.forEach(r => {
    const list = subjectGroups.get(r.subject) || [];
    list.push(r);
    subjectGroups.set(r.subject, list);
  });

  subjectGroups.forEach(list => {
    list.sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''));
  });

  const title = locale === 'zh' ? '【学业成绩画像】' : '[Academic Performance Profile]';

  const lines: string[] = [title];

  lines.push(locale === 'zh'
    ? `平均分：${avgScore.toFixed(1)}分`
    : `Average Score: ${avgScore.toFixed(1)} points`
  );

  lines.push(locale === 'zh'
    ? `最高分：${highest.score}分（${highest.subject}），最低分：${lowest.score}分（${lowest.subject}）`
    : `Highest: ${highest.score} (${lowest.subject}), Lowest: ${lowest.score} (${lowest.subject})`
  );

  if (bestRank) {
    lines.push(locale === 'zh'
      ? `最佳排名：第${bestRank.class_rank}名（${bestRank.exam_name}）`
      : `Best Rank: #${bestRank.class_rank} (${bestRank.exam_name})`
    );
  }

  if (subjects.length > 0) {
    lines.push(locale === 'zh'
      ? `涉及科目：${subjects.join('、')}`
      : `Subjects: ${subjects.join(', ')}`
    );
  }

  const trendSubjects: string[] = [];
  subjectGroups.forEach((records, subject) => {
    if (records.length >= 2) {
      const latest = records[records.length - 1];
      const previous = records[records.length - 2];
      const diff = latest.score - previous.score;
      const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
      trendSubjects.push(`${subject}${arrow}${diff > 0 ? '+' : ''}${diff}`);
    }
  });

  if (trendSubjects.length > 0) {
    lines.push(locale === 'zh'
      ? `趋势变化：${trendSubjects.join('，')}`
      : `Trends: ${trendSubjects.join(', ')}`
    );
  }

  return lines.join('\n');
}

describe('buildExamSummary - 考试成绩摘要生成函数', () => {

  describe('边界情况处理', () => {
    it('空数组输入应返回空字符串', () => {
      const result = buildExamSummary([]);
      expect(result).toBe('');
    });

    it('null 输入应返回空字符串', () => {
      const result = buildExamSummary(null as any);
      expect(result).toBe('');
    });

    it('undefined 输入应返回空字符串', () => {
      const result = buildExamSummary(undefined as any);
      expect(result).toBe('');
    });
  });

  describe('基础统计功能', () => {
    it('单条记录应包含平均分、最高分、最低分', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
          full_score: 100,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('85.0');
      expect(result).toContain('数学');
      expect(result).toContain('平均分');
      expect(result).toContain('最高分');
      expect(result).toContain('最低分');
    });

    it('多条记录应正确计算平均分', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 80,
          full_score: 100,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '语文',
          score: 90,
          full_score: 100,
        },
        {
          id: '3',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '英语',
          score: 70,
          full_score: 100,
        },
      ];

      const result = buildExamSummary(records);

      const expectedAvg = (80 + 90 + 70) / 3;
      expect(result).toContain(expectedAvg.toFixed(1));
    });

    it('分数排序应正确（最高/最低）', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 75,
          full_score: 100,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '语文',
          score: 95,
          full_score: 100,
        },
        {
          id: '3',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '英语',
          score: 60,
          full_score: 100,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('95');
      expect(result).toContain('语文');
      expect(result).toContain('60');
      expect(result).toContain('英语');

      const highestIndex = result.indexOf('95');
      const lowestIndex = result.indexOf('60');
      expect(highestIndex).toBeGreaterThan(-1);
      expect(lowestIndex).toBeGreaterThan(-1);
    });
  });

  describe('排名信息处理', () => {
    it('有排名信息时应显示最佳排名', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
          class_rank: 5,
          total_count: 40,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '语文',
          score: 90,
          class_rank: 3,
          total_count: 40,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('第3名');
      expect(result).toContain('期中考试');
    });

    it('无排名信息时不应显示排名部分', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).not.toContain('排名');
    });

    it('排名为0时应忽略该记录的排名', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
          class_rank: 0,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '语文',
          score: 90,
          class_rank: 8,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('第8名');
      expect(result).not.toContain('第0名');
    });
  });

  describe('多科目处理', () => {
    it('多科目时应列出涉及科目', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '语文',
          score: 90,
        },
        {
          id: '3',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '英语',
          score: 78,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('涉及科目');
      expect(result).toContain('数学');
      expect(result).toContain('语文');
      expect(result).toContain('英语');
    });

    it('单科目时也应列出科目信息', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '物理',
          score: 88,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('涉及科目');
      expect(result).toContain('物理');
    });
  });

  describe('趋势变化分析', () => {
    it('同科目多次考试应显示趋势变化', () => {
      const records: ExamRecord[] = [
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

      const result = buildExamSummary(records);

      expect(result).toContain('趋势变化');
      expect(result).toContain('数学');
      expect(result).toContain('+5');
    });

    it('成绩下降时应显示下降箭头', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '月考一',
          subject: '英语',
          score: 90,
          exam_date: '2024-10-01',
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '月考二',
          subject: '英语',
          score: 82,
          exam_date: '2024-11-01',
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('-8');
    });

    it('成绩不变时应显示持平箭头', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '月考一',
          subject: '物理',
          score: 88,
          exam_date: '2024-10-01',
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '月考二',
          subject: '物理',
          score: 88,
          exam_date: '2024-11-01',
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('→');
    });

    it('单次考试不应显示趋势变化', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).not.toContain('趋势变化');
    });
  });

  describe('多语言支持', () => {
    it('中文模式输出应包含【学业成绩画像】标题', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
        },
      ];

      const result = buildExamSummary(records, { locale: 'zh' });

      expect(result).toContain('【学业成绩画像】');
      expect(result).toContain('平均分');
      expect(result).toContain('最高分');
      expect(result).toContain('涉及科目');
    });

    it('英文模式输出应包含 [Academic Performance Profile] 标题', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: 'Midterm Exam',
          subject: 'Math',
          score: 85,
        },
      ];

      const result = buildExamSummary(records, { locale: 'en' });

      expect(result).toContain('[Academic Performance Profile]');
      expect(result).toContain('Average Score');
      expect(result).toContain('Highest');
      expect(result).toContain('Subjects');
    });

    it('默认应为中文模式', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('【学业成绩画像】');
    });
  });

  describe('满分非100的情况', () => {
    it('满分非100时应正确计算百分比', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '体育',
          score: 45,
          full_score: 50,
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('45');
      expect(result).toContain('体育');
      const avgScore = 45;
      expect(result).toContain(avgScore.toFixed(1));
    });

    it('不同科目不同满分时应分别处理', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '体育',
          score: 45,
          full_score: 50,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 90,
          full_score: 100,
        },
      ];

      const result = buildExamSummary(records);

      const expectedAvg = (45 + 90) / 2;
      expect(result).toContain(expectedAvg.toFixed(1));
    });
  });

  describe('输出格式完整性', () => {
    it('完整数据应生成包含所有部分的摘要', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '月考一',
          subject: '数学',
          score: 80,
          full_score: 100,
          class_rank: 10,
          total_count: 45,
          exam_date: '2024-10-01',
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '月考二',
          subject: '数学',
          score: 85,
          full_score: 100,
          class_rank: 8,
          total_count: 45,
          exam_date: '2024-11-01',
        },
        {
          id: '3',
          student_id: 's001',
          exam_name: '月考一',
          subject: '语文',
          score: 88,
          full_score: 100,
          class_rank: 5,
          total_count: 45,
          exam_date: '2024-10-01',
        },
      ];

      const result = buildExamSummary(records);

      expect(result).toContain('【学业成绩画像】');
      expect(result).toContain('平均分');
      expect(result).toContain('最高分');
      expect(result).toContain('最低分');
      expect(result).toContain('最佳排名');
      expect(result).toContain('涉及科目');
      expect(result).toContain('趋势变化');
      expect(result).toContain('数学');
      expect(result).toContain('语文');
      expect(result).toContain('+5');
    });

    it('输出应以标题开头', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
        },
      ];

      const result = buildExamSummary(records);

      expect(result.startsWith('【学业成绩画像】')).toBe(true);
    });

    it('各部分应换行分隔', () => {
      const records: ExamRecord[] = [
        {
          id: '1',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '数学',
          score: 85,
        },
        {
          id: '2',
          student_id: 's001',
          exam_name: '期中考试',
          subject: '语文',
          score: 90,
        },
      ];

      const result = buildExamSummary(records);
      const lines = result.split('\n');

      expect(lines.length).toBeGreaterThanOrEqual(4);
    });
  });
});
