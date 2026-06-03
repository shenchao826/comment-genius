export interface DataPoint {
  date: string;
  value: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  changeRate: number;
  average: number;
  latestValue: number;
  previousValue: number;
}

export interface AlertRule {
  id: string;
  type: 'score_drop' | 'behavior_negative' | 'coverage_low' | 'no_recent_data';
  severity: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  suggestion: string;
  check: (data: any) => boolean;
}

export interface StudentAlert {
  ruleId: string;
  type: string;
  severity: 'info' | 'warning' | 'danger';
  title: string;
  description: string;
  suggestion: string;
  timestamp: string;
}

export interface Insight {
  type: 'strength' | 'concern' | 'opportunity' | 'recommendation';
  title: string;
  content: string;
  icon: string;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  relatedData?: string[];
}

export function analyzeTrend(dataPoints: DataPoint[]): TrendAnalysis {
  if (!dataPoints || dataPoints.length < 2) {
    return {
      direction: 'stable',
      changeRate: 0,
      average: 0,
      latestValue: 0,
      previousValue: 0,
    };
  }

  // 按日期降序排列（最新的在前）
  const sorted = [...dataPoints].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sorted[0].value;
  const previous = sorted[1].value;

  const average = sorted.reduce((sum, p) => sum + p.value, 0) / sorted.length;
  const changeRate = previous !== 0 ? ((latest - previous) / Math.abs(previous)) * 100 : 0;

  let direction: 'up' | 'down' | 'stable' = 'stable';
  if (Math.abs(changeRate) > 10) {
    direction = changeRate > 0 ? 'up' : 'down';
  }

  return {
    direction,
    changeRate: Math.round(changeRate * 100) / 100,
    average: Math.round(average * 100) / 100,
    latestValue: latest,
    previousValue: previous,
  };
}

export function detectAnomalies(dataPoints: DataPoint[], threshold: number = 2): DataPoint[] {
  if (!dataPoints || dataPoints.length < 3) return [];

  const values = dataPoints.map(p => p.value);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return dataPoints.filter(point => {
    const zScore = stdDev !== 0 ? Math.abs((point.value - mean) / stdDev) : 0;
    return zScore > threshold;
  });
}

const ALERT_RULES: AlertRule[] = [
  {
    id: 'score_drop_significant',
    type: 'score_drop',
    severity: 'danger',
    title: '⚠️ 成绩显著下滑',
    description: '最近一次考试成绩相比前次下降超过15%',
    suggestion: '建议与学生进行深入沟通，了解原因并提供针对性辅导',
    check: (data: { exams?: Array<{ score: number; fullScore: number }> }) => {
      if (!data.exams || data.exams.length < 2) return false;
      const sorted = [...data.exams].sort((a: any, b: any) => 
        new Date(b.examDate || '').getTime() - new Date(a.examDate || '').getTime()
      );
      const latest = sorted[0];
      const previous = sorted[1];
      if (!latest.score || !previous.score || !previous.fullScore) return false;
      
      const dropRate = ((latest.score - previous.score) / previous.fullScore) * 100;
      return dropRate < -15;
    },
  },
  {
    id: 'behavior_negative_trend',
    type: 'behavior_negative',
    severity: 'warning',
    title: '📉 行为记录偏负面',
    description: '近期负面行为记录占比超过50%',
    suggestion: '关注学生情绪状态，适时开展心理疏导或正向激励',
    check: (data: { behaviors?: Array<{ behaviorType: string }> }) => {
      if (!data.behaviors || data.behaviors.length < 3) return false;
      const negativeTypes = ['违纪', '迟到', '缺交作业', '课堂干扰'];
      const recentBehaviors = data.behaviors.slice(-5);
      const negativeCount = recentBehaviors.filter(b => 
        negativeTypes.some(t => b.behaviorType?.includes(t))
      ).length;
      return (negativeCount / recentBehaviors.length) > 0.5;
    },
  },
  {
    id: 'coverage_insufficient',
    type: 'coverage_low',
    severity: 'info',
    title: '📊 数据覆盖度偏低',
    description: '部分维度缺少最近30天的记录',
    suggestion: '建议补充完善学生各维度数据，以便获得更全面的分析',
    check: (data: { coverageCount?: number; totalDimensions?: number }) => {
      if (!data.coverageCount || !data.totalDimensions) return false;
      const coverageRate = data.coverageCount / data.totalDimensions;
      return coverageRate < 0.75 && coverageRate >= 0.25;
    },
  },
  {
    id: 'no_recent_data',
    type: 'no_recent_data',
    severity: 'warning',
    title: '⏰ 缺少近期数据',
    description: '超过14天没有更新任何学生数据',
    suggestion: '及时录入最新的学生表现数据，保持数据的时效性',
    check: (data: { lastUpdateDate?: string }) => {
      if (!data.lastUpdateDate) return true;
      const daysSinceUpdate = (Date.now() - new Date(data.lastUpdateDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 14;
    },
  },
];

export function runAlertRules(studentData: any): StudentAlert[] {
  const alerts: StudentAlert[] = [];

  for (const rule of ALERT_RULES) {
    try {
      if (rule.check(studentData)) {
        alerts.push({
          ruleId: rule.id,
          type: rule.type,
          severity: rule.severity,
          title: rule.title,
          description: rule.description,
          suggestion: rule.suggestion,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Alert rule ${rule.id} error:`, error);
    }
  }

  return alerts.sort((a, b) => {
    const severityOrder = { danger: 3, warning: 2, info: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });
}

export function generateStudentInsights(studentData: any): Insight[] {
  const insights: Insight[] = [];
  
  const { exams = [], behaviors = [], conversations = [], homeVisits = [] } = studentData;

  // 分析优势科目
  if (exams.length >= 2) {
    const subjectAvg: Record<string, { total: number; count: number }> = {};
    exams.forEach((exam: any) => {
      if (exam.subject && exam.score != null) {
        if (!subjectAvg[exam.subject]) subjectAvg[exam.subject] = { total: 0, count: 0 };
        subjectAvg[exam.subject].total += exam.score;
        subjectAvg[exam.subject].count += 1;
      }
    });

    const topSubjects = Object.entries(subjectAvg)
      .map(([subject, data]) => ({ subject, avg: data.total / data.count }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 2);

    if (topSubjects.length > 0 && topSubjects[0].avg >= 85) {
      insights.push({
        type: 'strength',
        title: `🌟 ${topSubjects[0].subject} 表现优异`,
        content: `${topSubjects[0].subject}平均分达到${topSubjects[0].avg.toFixed(1)}分，是该生的明显优势学科`,
        icon: '🌟',
        priority: 'medium',
        actionable: false,
        relatedData: topSubjects.map(s => s.subject),
      });
    }
  }

  // 分析行为趋势
  if (behaviors.length >= 3) {
    const positiveTypes = ['积极发言', '帮助同学', '认真听讲', '完成作业', '进步'];
    const recentPositive = behaviors.slice(-5).filter((b: any) =>
      positiveTypes.some(t => b.behaviorType?.includes(t))
    ).length;

    if (recentPositive >= 3) {
      insights.push({
        type: 'opportunity',
        title: '💪 近期表现积极',
        content: `最近5条行为记录中有${recentPositive}条正面评价，可考虑公开表扬以强化正向行为`,
        icon: '💪',
        priority: 'low',
        actionable: true,
      });
    }
  }

  // 家访/谈话频率分析
  if (conversations.length >= 2 || homeVisits.length >= 1) {
    const totalInteractions = conversations.length + homeVisits.length;
    insights.push({
      type: 'recommendation',
      title: '🤝 保持家校沟通',
      content: `已进行${totalInteractions}次沟通记录，建议保持每月至少1次的沟通频率`,
      icon: '🤝',
      priority: 'low',
      actionable: true,
    });
  }

  // 数据完整性建议
  const hasExams = exams.length > 0;
  const hasBehaviors = behaviors.length > 0;
  const hasConversations = conversations.length > 0;
  const hasHomeVisits = homeVisits.length > 0;
  const dimensionCount = [hasExams, hasBehaviors, hasConversations, hasHomeVisits].filter(Boolean).length;

  if (dimensionCount === 4) {
    insights.push({
      type: 'strength',
      title: '✅ 数据完整度高',
      content: '四个维度均有数据记录，可以进行全面的学情分析',
      icon: '✅',
      priority: 'low',
      actionable: false,
    });
  } else if (dimensionCount <= 2) {
    insights.push({
      type: 'concern',
      title: '📝 数据待补充',
      content: `当前仅${dimensionCount}/4个维度有数据，建议补充其他维度的记录以获得更全面的分析`,
      icon: '📝',
      priority: 'medium',
      actionable: true,
    });
  }

  return insights;
}
