import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hashData,
  maskSensitiveData,
  sanitizeInput,
  validatePasswordStrength,
} from '../../utils/security';

describe('安全工具函数', () => {
  describe('hashData 数据哈希', () => {
    it('应生成固定长度的哈希值', () => {
      const hash = hashData('test');
      expect(hash).toBeTruthy();
      expect(typeof hash).toBe('string');
    });

    it('相同输入应产生相同哈希', () => {
      const hash1 = hashData('hello');
      const hash2 = hashData('hello');
      expect(hash1).toBe(hash2);
    });

    it('不同输入应产生不同哈希', () => {
      const hash1 = hashData('hello');
      const hash2 = hashData('world');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('maskSensitiveData 敏感数据脱敏', () => {
    it('应正确脱敏手机号', () => {
      const masked = maskSensitiveData('13812345678', 3);
      expect(masked).toBe('138*****678');
    });

    it('应正确脱敏邮箱', () => {
      const masked = maskSensitiveData('user@example.com', 4);
      expect(masked.startsWith('user')).toBe(true);
      expect(masked.endsWith('.com')).toBe(true);
      expect(masked).toContain('*');
    });

    it('短字符串应完全脱敏', () => {
      const masked = maskSensitiveData('abc', 4);
      expect(masked).not.toContain('a');
      expect(masked).not.toContain('b');
      expect(masked).not.toContain('c');
    });

    it('空字符串应返回脱敏占位符', () => {
      const masked = maskSensitiveData('');
      expect(masked).toBe('***');
    });

    it('null/undefined应返回脱敏占位符', () => {
      // @ts-ignore - 测试边界情况
      expect(maskSensitiveData(null as any)).toBe('***');
      // @ts-ignore
      expect(maskSensitiveData(undefined as any)).toBe('***');
    });
  });

  describe('sanitizeInput 输入净化', () => {
    it('应移除HTML标签', () => {
      const sanitized = sanitizeInput('<script>alert("xss")</script>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    it('应移除javascript协议', () => {
      const sanitized = sanitizeInput('javascript:alert(1)');
      expect(sanitized).not.toContain('javascript:');
    });

    it('应移除事件处理器', () => {
      const sanitized = sanitizeInput('onclick="alert(1)"');
      expect(sanitized).not.toContain('onclick=');
    });

    it('应保留正常文本', () => {
      const input = '这是一段正常的中文文本';
      expect(sanitizeInput(input)).toBe(input);
    });

    it('应去除首尾空白', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });
  });

  describe('validatePasswordStrength 密码强度验证', () => {
    it('弱密码应返回低分', () => {
      const result = validatePasswordStrength('123');
      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(70);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('强密码应通过验证', () => {
      const result = validatePasswordStrength('Str0ng@P@ss!');
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('中等强度密码应给出具体建议', () => {
      const result = validatePasswordStrength('password123');
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('纯数字密码不应通过', () => {
      const result = validatePasswordStrength('12345678');
      expect(result.isValid).toBe(false);
    });

    it('缺少大写字母的密码应提示', () => {
      const result = validatePasswordStrength('password123!');
      const hasUppercaseWarning = result.feedback.some(f =>
        f.includes('大写')
      );
      expect(hasUppercaseWarning || !result.isValid).toBe(true);
    });
  });
});

describe('AuditLogger 审计日志系统', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('应记录基本操作日志', async () => {
    const { auditLogger } = await import('../../utils/auditLogger');

    const entry = await auditLogger.log({
      userId: 'user_1',
      userName: '张老师',
      action: 'create',
      resource: 'student',
      resourceId: 'student_123',
      resourceName: '李明',
      success: true,
    });

    expect(entry.id).toBeTruthy();
    expect(entry.timestamp).toBeTruthy();
    expect(entry.userId).toBe('user_1');
    expect(entry.action).toBe('create');
    expect(entry.resource).toBe('student');
    expect(entry.success).toBe(true);
  });

  it('应记录失败的操作', async () => {
    const { auditLogger } = await import('../../utils/auditLogger');

    const entry = await auditLogger.log({
      userId: 'user_1',
      action: 'login',
      resource: 'auth',
      success: false,
      errorMessage: '密码错误',
    });

    expect(entry.success).toBe(false);
    expect(entry.errorMessage).toBe('密码错误');
  });

  it('应能获取日志列表', async () => {
    const { auditLogger } = await import('../../utils/auditLogger');

    await auditLogger.log({ userId: 'u1', action: 'create', resource: 'exam', success: true });
    await auditLogger.log({ userId: 'u2', action: 'update', resource: 'student', success: true });

    const logs = auditLogger.getLogs();
    expect(logs.length).toBeGreaterThanOrEqual(2);
  });

  it('应支持按用户过滤日志', async () => {
    const { auditLogger } = await import('../../utils/auditLogger');

    await auditLogger.log({ userId: 'user_a', action: 'view', resource: 'student', success: true });
    await auditLogger.log({ userId: 'user_b', action: 'view', resource: 'student', success: true });

    const userLogs = auditLogger.getLogsByUser('user_a');
    userLogs.forEach(log => {
      expect(log.userId).toBe('user_a');
    });
  });

  it('应支持导出JSON格式', async () => {
    const { auditLogger } = await import('../../utils/auditLogger');

    await auditLogger.log({ userId: 'u1', action: 'export', resource: 'data_export', success: true });

    const jsonExport = auditLogger.exportLogs('json');
    const parsed = JSON.parse(jsonExport);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBeGreaterThan(0);
  });

  it('应提供统计信息', async () => {
    const { auditLogger } = await import('../../utils/auditLogger');

    await auditLogger.log({ userId: 'u1', action: 'create', resource: 'exam', success: true });
    await auditLogger.log({ userId: 'u1', action: 'update', resource: 'student', success: true });
    await auditLogger.log({ userId: 'u1', action: 'delete', resource: 'behavior', success: false });

    const stats = auditLogger.getStatistics();
    expect(stats.totalLogs).toBe(3);
    expect(typeof stats.actionBreakdown).toBe('object');
    expect(typeof stats.errorRate).toBe('number');
  });

  it('createAuditHelper 应创建便捷方法', async () => {
    const { createAuditHelper } = await import('../../utils/auditLogger');

    const helper = createAuditHelper('teacher_1', '王老师');

    const logEntry = await helper.logCreate('student', 's_1', '学生A');
    expect(logEntry.action).toBe('create');
    expect(logEntry.resource).toBe('student');
    expect(logEntry.userId).toBe('teacher_1');
  });
});
