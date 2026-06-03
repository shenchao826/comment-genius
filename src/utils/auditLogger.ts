export type AuditAction =
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

export type AuditResource =
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

export interface AuditLogEntry {
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

export interface AuditLogFilter {
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

export class AuditLogger {
  private static instance: AuditLogger | null = null;

  private constructor() {}

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<AuditLogEntry> {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: generateId(),
      timestamp: new Date().toISOString(),
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
    };

    try {
      const logs = this.getLogsFromStorage();
      logs.unshift(fullEntry);

      if (logs.length > MAX_LOCAL_LOGS) {
        logs.splice(MAX_LOCAL_LOGS);
      }

      this.saveLogsToStorage(logs);

      if (entry.success && entry.action !== 'view') {
        this.sendToServer(fullEntry).catch(err => 
          console.error('Failed to send audit log to server:', err)
        );
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
    }

    return fullEntry;
  }

  async logAction(params: {
    userId: string;
    userName?: string;
    action: AuditAction;
    resource: AuditResource;
    resourceId?: string;
    resourceName?: string;
    details?: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
  }): Promise<AuditLogEntry> {
    return this.log(params);
  }

  getLogs(filter?: AuditLogFilter): AuditLogEntry[] {
    let logs = this.getLogsFromStorage();

    if (filter) {
      logs = this.applyFilter(logs, filter);
    }

    return logs;
  }

  getLogsByUser(userId: string, limit: number = 50): AuditLogEntry[] {
    return this.getLogs({ userId, limit });
  }

  getRecentLogs(limit: number = 20): AuditLogEntry[] {
    return this.getLogs({ limit });
  }

  getErrorLogs(limit: number = 20): AuditLogEntry[] {
    return this.getLogs({ success: false, limit });
  }

  clearLocalLogs(olderThanDays?: number): void {
    if (olderThanDays) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const logs = this.getLogsFromStorage().filter(
        log => new Date(log.timestamp) > cutoffDate
      );
      this.saveLogsToStorage(logs);
    } else {
      localStorage.removeItem(AUDIT_LOG_KEY);
    }
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

  getStatistics(): {
    totalLogs: number;
    todayCount: number;
    weekCount: number;
    actionBreakdown: Record<string, number>;
    resourceBreakdown: Record<string, number>;
    errorRate: number;
    topUsers: Array<{ userId: string; count: number }>;
  } {
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

  private getLogsFromStorage(): AuditLogEntry[] {
    try {
      const stored = localStorage.getItem(AUDIT_LOG_KEY);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  private saveLogsToStorage(logs: AuditLogEntry[]): void {
    try {
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to save audit logs:', error);
    }
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

  private async getClientIP(): Promise<string | undefined> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return undefined;
    }
  }

  private async sendToServer(entry: AuditLogEntry): Promise<void> {
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
    
    const response = await fetch('/api/audit/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      throw new Error(`Failed to send audit log: ${response.status}`);
    }
  }
}

export const auditLogger = AuditLogger.getInstance();

export function createAuditHelper(userId: string, userName?: string) {
  return {
    logCreate: (resource: AuditResource, resourceId?: string, resourceName?: string, details?: Record<string, unknown>) =>
      auditLogger.logAction({
        userId,
        userName,
        action: 'create',
        resource,
        resourceId,
        resourceName,
        details,
        success: true,
      }),

    logUpdate: (resource: AuditResource, resourceId?: string, resourceName?: string, details?: Record<string, unknown>) =>
      auditLogger.logAction({
        userId,
        userName,
        action: 'update',
        resource,
        resourceId,
        resourceName,
        details,
        success: true,
      }),

    logDelete: (resource: AuditResource, resourceId?: string, resourceName?: string) =>
      auditLogger.logAction({
        userId,
        userName,
        action: 'delete',
        resource,
        resourceId,
        resourceName,
        success: true,
      }),

    logView: (resource: AuditResource, resourceId?: string, resourceName?: string) =>
      auditLogger.logAction({
        userId,
        userName,
        action: 'view',
        resource,
        resourceId,
        resourceName,
        success: true,
      }),

    logExport: (resource: AuditResource, details?: Record<string, unknown>) =>
      auditLogger.logAction({
        userId,
        userName,
        action: 'export',
        resource,
        details,
        success: true,
      }),

    logLogin: () =>
      auditLogger.logAction({
        userId,
        userName,
        action: 'login',
        resource: 'auth',
        success: true,
      }),

    logLogout: () =>
      auditLogger.logAction({
        userId,
        userName,
        action: 'logout',
        resource: 'auth',
        success: true,
      }),
  };
}
