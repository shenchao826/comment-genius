import { describe, it, expect } from 'vitest';
import {
  analyzeTrend,
  detectAnomalies,
  runAlertRules,
  generateStudentInsights,
} from '../../utils/dataAnalytics';

describe('数据分析工具函数', () => {
  describe('analyzeTrend 趋势分析', () => {
    it('应正确识别上升趋势', () => {
      const data = [
        { date: '2026-01-01', value: 80 },
        { date: '2026-02-01', value: 90 },
      ];
      const result = analyzeTrend(data);

      expect(result.direction).toBe('up');
      expect(result.changeRate).toBeGreaterThan(0);
    });

    it('应正确识别下降趋势', () => {
      const data = [
        { date: '2026-01-01', value: 90 },
        { date: '2026-02-01', value: 75 },
      ];
      const result = analyzeTrend(data);

      expect(result.direction).toBe('down');
      expect(result.changeRate).toBeLessThan(0);
    });

    it('应识别稳定趋势', () => {
      const data = [
        { date: '2026-01-01', value: 85 },
        { date: '2026-02-01', value: 86 },
      ];
      const result = analyzeTrend(data);

      expect(result.direction).toBe('stable');
    });

    it('空数据应返回稳定状态', () => {
      const result = analyzeTrend([]);

      expect(result.direction).toBe('stable');
      expect(result.average).toBe(0);
    });

    it('单数据点应返回稳定状态', () => {
      const data = [{ date: '2026-01-01', value: 85 }];
      const result = analyzeTrend(data);

      expect(result.direction).toBe('stable');
    });

    it('应正确计算平均值', () => {
      const data = [
        { date: '2026-01-01', value: 80 },
        { date: '2026-02-01', value: 90 },
        { date: '2026-03-01', value: 100 },
      ];
      const result = analyzeTrend(data);

      expect(result.average).toBe(90);
    });
  });

  describe('detectAnomalies 异常值检测', () => {
    it('应检测到异常值', () => {
      const data = [
        { date: '2026-01-01', value: 80 },
        { date: '2026-02-01', value: 82 },
        { date: '2026-03-01', value: 78 },
        { date: '2026-04-01', value: 81 },
        { date: '2026-05-01', value: 30 }, // 异常低
      ];
      const anomalies = detectAnomalies(data, 1.5);

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].value).toBe(30);
    });

    it('正常数据不应检测到异常', () => {
      const data = [
        { date: '2026-01-01', value: 80 },
        { date: '2026-02-01', value: 82 },
        { date: '2026-03-01', value: 78 },
        { date: '2026-04-01', value: 81 },
      ];
      const anomalies = detectAnomalies(data);

      expect(anomalies.length).toBe(0);
    });

    it('数据不足时应返回空数组', () => {
      const data = [{ date: '2026-01-01', value: 80 }];
      const anomalies = detectAnomalies(data);

      expect(anomalies.length).toBe(0);
    });
  });

  describe('runAlertRules 预警规则引擎', () => {
    it('应检测成绩显著下滑', () => {
      const studentData = {
        exams: [
          { score: 95, fullScore: 100, examDate: '2026-05-01' },
          { score: 75, fullScore: 100, examDate: '2026-06-01' }, // 下滑20%
        ],
      };
      const alerts = runAlertRules(studentData);

      const scoreDropAlert = alerts.find(a => a.type === 'score_drop');
      expect(scoreDropAlert).toBeDefined();
      expect(scoreDropAlert?.severity).toBe('danger');
    });

    it('正常成绩不应触发下滑预警', () => {
      const studentData = {
        exams: [
          { score: 88, fullScore: 100, examDate: '2026-05-01' },
          { score: 92, fullScore: 100, examDate: '2026-06-01' },
        ],
      };
      const alerts = runAlertRules(studentData);

      const scoreDropAlert = alerts.find(a => a.type === 'score_drop');
      expect(scoreDropAlert).toBeUndefined();
    });

    it('应检测负面行为占比过高', () => {
      const studentData = {
        behaviors: [
          { behaviorType: '迟到' },
          { behaviorType: '违纪' },
          { behaviorType: '缺交作业' },
          { behaviorType: '课堂干扰' },
        ],
      };
      const alerts = runAlertRules(studentData);

      const behaviorAlert = alerts.find(a => a.type === 'behavior_negative');
      expect(behaviorAlert).toBeDefined();
      expect(behaviorAlert?.severity).toBe('warning');
    });

    it('应检测缺少近期数据', () => {
      const studentData = {
        lastUpdateDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15天前
      };
      const alerts = runAlertRules(studentData);

      const noDataAlert = alerts.find(a => a.type === 'no_recent_data');
      expect(noDataAlert).toBeDefined();
    });

    it('预警应按严重程度排序', () => {
      const studentData = {
        exams: [
          { score: 95, fullScore: 100, examDate: '2026-05-01' },
          { score: 70, fullScore: 100, examDate: '2026-06-01' },
        ],
        lastUpdateDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        coverageCount: 1,
        totalDimensions: 4,
      };
      const alerts = runAlertRules(studentData);

      if (alerts.length >= 2) {
        const severityOrder = { danger: 3, warning: 2, info: 1 };
        for (let i = 0; i < alerts.length - 1; i++) {
          expect(severityOrder[alerts[i].severity]).toBeGreaterThanOrEqual(
            severityOrder[alerts[i + 1].severity]
          );
        }
      }
    });
  });

  describe('generateStudentInsights 智能洞察生成', () => {
    it('应生成优势科目洞察', () => {
      const studentData = {
        exams: [
          { subject: '数学', score: 95, fullScore: 100 },
          { subject: '数学', score: 93, fullScore: 100 },
          { subject: '语文', score: 78, fullScore: 100 },
        ],
      };
      const insights = generateStudentInsights(studentData);

      const strengthInsight = insights.find(i => i.type === 'strength');
      expect(strengthInsight).toBeDefined();
      expect(strengthInsight?.title).toContain('数学');
    });

    it('应生成积极行为洞察', () => {
      const studentData = {
        behaviors: [
          { behaviorType: '积极发言' },
          { behaviorType: '帮助同学' },
          { behaviorType: '认真听讲' },
        ],
      };
      const insights = generateStudentInsights(studentData);

      const opportunityInsight = insights.find(i => i.type === 'opportunity');
      expect(opportunityInsight).toBeDefined();
    });

    it('应生成家校沟通建议', () => {
      const studentData = {
        conversations: [{}, {}],
      };
      const insights = generateStudentInsights(studentData);

      const recommendInsight = insights.find(i => i.type === 'recommendation');
      expect(recommendInsight).toBeDefined();
    });

    it('完整数据应生成数据完整度表扬', () => {
      const studentData = {
        exams: [{}],
        behaviors: [{}],
        conversations: [{}],
        homeVisits: [{}],
      };
      const insights = generateStudentInsights(studentData);

      const completeInsight = insights.find(i =>
        i.title.includes('数据完整')
      );
      expect(completeInsight).toBeDefined();
    });

    it('不完整数据应生成补充建议', () => {
      const studentData = {
        exams: [{}],
      };
      const insights = generateStudentInsights(studentData);

      const concernInsight = insights.find(i => i.type === 'concern');
      expect(concernInsight).toBeDefined();
      expect(concernInsight?.actionable).toBe(true);
    });

    it('无数据时不应报错', () => {
      const insights = generateStudentInsights({});

      expect(Array.isArray(insights)).toBe(true);
    });
  });
});
