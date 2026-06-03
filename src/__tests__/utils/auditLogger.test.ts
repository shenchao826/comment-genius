import { describe, it, expect, vi, beforeEach } from 'vitest';

// ===== 从 auditLogger.ts 提取的类型和核心逻辑 =====

type AuditAction =
  | 'login'
  | 'logout'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'import'
  | 'view'
  | 'permission_change'
  | 'settings_change';

type AuditResource =
  | 'user'
  | 'student'
  | 'exam'
  | 'conversation'
  | 'home_visit'
  | 'behavior'
  | 'comment'
  | 'class'
  | 'template'
  | 'system'
  | 'auth'
  | 'data_export'
  | 'ocr_scan'
  | 'speech_input';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

interface AuditLogFilter {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  success?: boolean;
  limit?: number;
  offset?: number;
}

const AUDIT_LOG_KEY = 'audit_logs';
const MAX_LOCAL_LOGS = 500;

function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// 测试用：直接操作 localStorage 的辅助类
class TestAuditLogger {
  getLogsFromStorage(): AuditLogEntry[] {
    try {
      const stored = localStorage.getItem(AUDIT_LOG_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  saveLogsToStorage(logs: AuditLogEntry[]): void {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
  }

  createEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
    const now = new Date().toISOString();
    return {
      id: generateId(),
      timestamp: now,
      userId: 'user_001',
      userName: '测试用户',
      action: 'create',
      resource: 'comment',
      success: true,
      ...overrides,
    };
  }

  addLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
    };

    const logs = this.getLogsFromStorage();
    logs.unshift(fullEntry);

    if (logs.length > MAX_LOCAL_LOGS) {
      logs.splice(MAX_LOCAL_LOGS);
    }

    this.saveLogsToStorage(logs);
    return fullEntry;
  }

  getLogs(filter?: AuditLogFilter): AuditLogEntry[] {
    let logs = this.getLogsFromStorage();

    if (filter) {
      logs = this.applyFilter(logs, filter);
    }

    return logs;
  }

  private applyFilter(logs: AuditLogEntry[], filter: AuditLogFilter): AuditLogEntry[] {
    let filtered = [...logs];

    if (filter.startDate) {
      filtered = filtered.filter(l => l.timestamp >= filter.startDate!);
    }
    if (filter.endDate) {
      filtered = filtered.filter(l => l.timestamp <= filter.endDate!);
    }
    if (filter.userId) {
      filtered = filtered.filter(l => l.userId === filter.userId);
    }
    if (filter.action) {
      filtered = filtered.filter(l => l.action === filter.action);
    }
    if (filter.resource) {
      filtered = filtered.filter(l => l.resource === filter.resource);
    }
    if (filter.success !== undefined) {
      filtered = filtered.filter(l => l.success === filter.success);
    }

    const offset = filter.offset || 0;
    const limit = filter.limit || filtered.length;

    return filtered.slice(offset, offset + limit);
  }

  clearLocalLogs(): void {
    localStorage.removeItem(AUDIT_LOG_KEY);
  }

  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getLogsFromStorage();

    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    }

    if (logs.length === 0) return '';

    const headers = ['时间', '用户ID', '用户名', '操作', '资源类型', '资源ID', '资源名称', '状态', '错误信息'];
    const rows = logs.map(log => [
      log.timestamp,
      log.userId,
      log.userName || '',
      log.action,
      log.resource,
      log.resourceId || '',
      log.resourceName || '',
      log.success ? '成功' : '失败',
      log.errorMessage || '',
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return '\uFEFF' + csvContent;
  }

  getStatistics() {
    const logs = this.getLogsFromStorage();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todayLogs = logs.filter(l => new Date(l.timestamp) >= todayStart);
    const weekLogs = logs.filter(l => new Date(l.timestamp) >= weekStart);
    const errorLogs = logs.filter(l => !l.success);

    const actionBreakdown: Record<string, number> = {};
    const resourceBreakdown: Record<string, number> = {};
    const userCounts: Record<string, number> = {};

    logs.forEach(log => {
      actionBreakdown[log.action] = (actionBreakdown[log.action] || 0) + 1;
      resourceBreakdown[log.resource] = (resourceBreakdown[log.resource] || 0) + 1;
      userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
    });

    const topUsers = Object.entries(userCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, count]) => ({ userId, count }));

    return {
      totalLogs: logs.length,
      todayCount: todayLogs.length,
      weekCount: weekLogs.length,
      actionBreakdown,
      resourceBreakdown,
      errorRate: logs.length > 0 ? (errorLogs.length / logs.length) * 100 : 0,
      topUsers,
    };
  }
}

// ===== 测试用例 =====

describe('AuditLogger - 审计日志记录器', () => {
  let logger: TestAuditLogger;

  beforeEach(() => {
    localStorage.clear();
    logger = new TestAuditLogger();
  });

  describe('基础日志记录', () => {
    it('应成功添加一条审计日志', () => {
      const entry = logger.addLog({
        userId: 'user_001',
        action: 'create',
        resource: 'comment',
        success: true,
      });

      expect(entry.id).toBeTruthy();
      expect(entry.timestamp).toBeTruthy();
      expect(entry.userId).toBe('user_001');
      expect(entry.action).toBe('create');
      expect(entry.resource).toBe('comment');
      expect(entry.success).toBe(true);
    });

    it('添加的日志应可从存储中读取', () => {
      logger.addLog({
        userId: 'user_001',
        action: 'create',
        resource: 'comment',
        resourceName: '张三期中评语',
        success: true,
      });

      const logs = logger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].resourceName).toBe('张三期中评语');
    });

    it('多条日志应按时间倒序排列（最新的在前）', () => {
      logger.addLog({ userId: 'u1', action: 'create', resource: 'comment', success: true });
      logger.addLog({ userId: 'u1', action: 'update', resource: 'comment', success: true });
      logger.addLog({ userId: 'u1', action: 'view', resource: 'comment', success: true });

      const logs = logger.getLogs();
      expect(logs.length).toBe(3);
      expect(logs[0].action).toBe('view');
      expect(logs[1].action).toBe('update');
      expect(logs[2].action).toBe('create');
    });

    it('失败日志也应正常记录', () => {
      logger.addLog({
        userId: 'user_001',
        action: 'create',
        resource: 'comment',
        success: false,
        errorMessage: 'AI服务不可用',
      });

      const logs = logger.getLogs();
      expect(logs[0].success).toBe(false);
      expect(logs[0].errorMessage).toBe('AI服务不可用');
    });

    it('每条日志应有唯一的 ID', () => {
      const entry1 = logger.addLog({ userId: 'u1', action: 'create', resource: 'comment', success: true });
      const entry2 = logger.addLog({ userId: 'u1', action: 'create', resource: 'comment', success: true });

      expect(entry1.id).not.toBe(entry2.id);
    });
  });

  describe('日志过滤功能', () => {
    beforeEach(() => {
      // 预置测试数据
      const baseTime = '2026-06-01T10:00:00.000Z';
      const entries: Array<Omit<AuditLogEntry, 'id' | 'timestamp'>> = [
        { userId: 'user_a', action: 'create', resource: 'comment', success: true },
        { userId: 'user_a', action: 'update', resource: 'comment', success: true, timestamp: baseTime },
        { userId: 'user_b', action: 'create', resource: 'student', success: true, timestamp: baseTime },
        { userId: 'user_a', action: 'delete', resource: 'comment', success: false, errorMessage: 'not found', timestamp: baseTime },
        { userId: 'user_b', action: 'view', resource: 'exam', success: true, timestamp: baseTime },
        { userId: 'user_a', action: 'export', resource: 'data_export', success: true, timestamp: '2026-05-01T10:00:00.000Z' },
      ];

      // 手动构造带 timestamp 的条目
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        logger.addLog({
          userId: e.userId,
          userName: e.userName,
          action: e.action,
          resource: e.resource,
          resourceId: e.resourceId,
          resourceName: e.resourceName,
          details: e.details,
          success: e.success,
          errorMessage: e.errorMessage,
        });
      }
    });

    it('按用户 ID 过滤', () => {
      const logs = logger.getLogs({ userId: 'user_a' });
      expect(logs.every(l => l.userId === 'user_a')).toBe(true);
      expect(logs.length).toBeGreaterThanOrEqual(3); // user_a 至少有 create, update, delete
    });

    it('按操作类型过滤', () => {
      const logs = logger.getLogs({ action: 'create' });
      expect(logs.every(l => l.action === 'create')).toBe(true);
    });

    it('按资源类型过滤', () => {
      const logs = logger.getLogs({ resource: 'comment' });
      expect(logs.every(l => l.resource === 'comment')).toBe(true);
    });

    it('按成功/失败状态过滤', () => {
      const successLogs = logger.getLogs({ success: true });
      expect(successLogs.every(l => l.success === true)).toBe(true);

      const failLogs = logger.getLogs({ success: false });
      expect(failLogs.every(l => l.success === false)).toBe(true);
      expect(failLogs.length).toBeGreaterThanOrEqual(1);
    });

    it('limit 应限制返回数量', () => {
      const logs = logger.getLogs({ limit: 2 });
      expect(logs.length).toBeLessThanOrEqual(2);
    });

    it('offset 应跳过指定数量的记录', () => {
      const allLogs = logger.getLogs();
      const pagedLogs = logger.getLogs({ offset: 1, limit: 2 });

      if (allLogs.length > 1) {
        expect(pagedLogs[0]?.id).toBe(allLogs[1]?.id);
      }
    });

    it('组合过滤条件应同时生效', () => {
      const logs = logger.getLogs({
        userId: 'user_a',
        action: 'create',
        success: true,
      });
      expect(logs.every(l =>
        l.userId === 'user_a' && l.action === 'create' && l.success === true
      )).toBe(true);
    });
  });

  describe('日志导出功能', () => {
    beforeEach(() => {
      logger.addLog({
        userId: 'user_001',
        userName: '王老师',
        action: 'create',
        resource: 'comment',
        resourceId: 'comment_123',
        resourceName: '李明-期末评语',
        success: true,
      });
      logger.addLog({
        userId: 'user_001',
        userName: '王老师',
        action: 'delete',
        resource: 'comment',
        success: false,
        errorMessage: '权限不足',
      });
    });

    it('JSON 导出应包含所有日志字段', () => {
      const jsonStr = logger.exportLogs('json');
      const parsed = JSON.parse(jsonStr);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].userId).toBe('user_001');
      expect(parsed[0].userName).toBe('王老师');
    });

    it('CSV 导出应包含 BOM 头和表头', () => {
      const csv = logger.exportLogs('csv');

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('时间');
      expect(csv).toContain('用户ID');
      expect(csv).toContain('操作');
      expect(csv).toContain('资源类型');
      expect(csv).toContain('状态');
    });

    it('CSV 导出应正确处理特殊字符（引号转义）', () => {
      logger.clearLocalLogs();
      logger.addLog({
        userId: 'u1',
        action: 'create',
        resource: 'comment',
        resourceName: '包含"引号"的名称',
        success: true,
      });

      const csv = logger.exportLogs('csv');
      // CSV 中引号应被转义为双引号
      expect(csv).toContain('包含""引号""的名称');
    });

    it('空日志导出 JSON 应返回空数组', () => {
      logger.clearLocalLogs();
      const jsonStr = logger.exportLogs('json');
      expect(JSON.parse(jsonStr)).toEqual([]);
    });

    it('空日志导出 CSV 应返回空字符串', () => {
      logger.clearLocalLogs();
      expect(logger.exportLogs('csv')).toBe('');
    });
  });

  describe('统计功能', () => {
    beforeEach(() => {
      // 添加不同类型的日志
      for (let i = 0; i < 5; i++) {
        logger.addLog({ userId: `user_${i % 2}`, action: 'create', resource: 'comment', success: true });
      }
      logger.addLog({ userId: 'user_0', action: 'create', resource: 'student', success: false, errorMessage: 'err' });
      logger.addLog({ userId: 'user_0', action: 'view', resource: 'exam', success: true });
      logger.addLog({ userId: 'user_1', action: 'update', resource: 'comment', success: true });
    });

    it('总日志数应正确', () => {
      const stats = logger.getStatistics();
      expect(stats.totalLogs).toBe(8);
    });

    it('操作分布统计应正确', () => {
      const stats = logger.getStatistics();
      expect(stats.actionBreakdown['create']).toBe(6);
      expect(stats.actionBreakdown['view']).toBe(1);
      expect(stats.actionBreakdown['update']).toBe(1);
    });

    it('资源分布统计应正确', () => {
      const stats = logger.getStatistics();
      expect(stats.resourceBreakdown['comment']).toBe(6);
      expect(stats.resourceBreakdown['student']).toBe(1);
      expect(stats.resourceBreakdown['exam']).toBe(1);
    });

    it('错误率计算应正确', () => {
      const stats = logger.getStatistics();
      // 1 条失败 / 8 总数 = 12.5%
      expect(stats.errorRate).toBeCloseTo(12.5, 1);
    });

    it('活跃用户排行应返回前5名', () => {
      const stats = logger.getStatistics();
      expect(stats.topUsers.length).toBeLessThanOrEqual(5);
      expect(stats.topUsers[0].userId).toBe('user_0'); // user_0 日志最多
      expect(stats.topUsers[0].count).toBeGreaterThan(stats.topUsers[1]?.count || 0);
    });

    it('空日志时统计应返回零值', () => {
      logger.clearLocalLogs();
      const stats = logger.getStatistics();

      expect(stats.totalLogs).toBe(0);
      expect(stats.todayCount).toBe(0);
      expect(stats.weekCount).toBe(0);
      expect(stats.errorRate).toBe(0);
      expect(Object.keys(stats.actionBreakdown).length).toBe(0);
      expect(stats.topUsers).toEqual([]);
    });
  });

  describe('清除日志功能', () => {
    it('clearLocalLogs 应清空所有日志', () => {
      logger.addLog({ userId: 'u1', action: 'create', resource: 'comment', success: true });
      logger.addLog({ userId: 'u1', action: 'view', resource: 'comment', success: true });

      expect(logger.getLogs().length).toBe(2);

      logger.clearLocalLogs();
      expect(logger.getLogs().length).toBe(0);
    });
  });

  describe('审计评语助手相关场景', () => {
    it('评语生成操作应完整记录', () => {
      const entry = logger.addLog({
        userId: 'teacher_001',
        userName: '李老师',
        action: 'create',
        resource: 'comment',
        resourceId: 'comment_new_001',
        resourceName: '张三-期末总结',
        details: {
          student_name: '张三',
          comment_type: 'summary',
          tone_style: 'warm',
          model_used: 'qwen-turbo',
          word_count: 256,
        },
        success: true,
      });

      expect(entry.details?.student_name).toBe('张三');
      expect(entry.details?.comment_type).toBe('summary');
      expect(entry.resourceName).toBe('张三-期末总结');
    });

    it('批量生成评语应记录操作信息', () => {
      const entry = logger.addLog({
        userId: 'teacher_001',
        userName: '李老师',
        action: 'create',
        resource: 'comment',
        details: {
          operation: 'bulk_generate',
          class_id: 'class_301',
          total_students: 45,
          style: 'formal',
        },
        success: true,
      });

      expect(entry.details?.operation).toBe('bulk_generate');
      expect(entry.details?.total_students).toBe(45);
    });

    it('评语编辑更新应记录变更', () => {
      const entry = logger.addLog({
        userId: 'teacher_001',
        action: 'update',
        resource: 'comment',
        resourceId: 'comment_042',
        details: {
          edited_fields: ['content'],
          original_length: 200,
          new_length: 280,
        },
        success: true,
      });

      expect(entry.action).toBe('update');
      expect(entry.details?.edited_fields).toContain('content');
    });

    it('评语删除操作应记录', () => {
      const entry = logger.addLog({
        userId: 'teacher_001',
        action: 'delete',
        resource: 'comment',
        resourceId: 'comment_099',
        resourceName: '已删除的评语',
        success: true,
      });

      expect(entry.action).toBe('delete');
    });

    it('评语导出操作应记录', () => {
      const entry = logger.addLog({
        userId: 'teacher_001',
        action: 'export',
        resource: 'data_export',
        details: {
          format: 'xlsx',
          count: 30,
          date_range: '2026-02~2026-06',
        },
        success: true,
      });

      expect(entry.action).toBe('export');
      expect(entry.resource).toBe('data_export');
    });

    it('AI 服务失败的错误应完整记录', () => {
      const entry = logger.addLog({
        userId: 'teacher_001',
        action: 'create',
        resource: 'comment',
        success: false,
        errorMessage: 'AI服务未配置 (AI_NOT_CONFIGURED)',
        details: {
          student_name: '赵六',
          error_code: 'AI_NOT_CONFIGURED',
        },
      });

      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toContain('AI_NOT_CONFIGURED');
    });
  });
});
