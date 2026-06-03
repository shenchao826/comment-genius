import { describe, it, expect } from 'vitest';
import {
  CLASS_ROLES,
  ROLE_CATEGORIES,
  getRoleById,
  getRolesByCategory,
  getSelectableRoles,
} from '@/data/class-roles';

describe('class-roles 数据模块', () => {
  it('应包含10种职务', () => {
    expect(CLASS_ROLES.length).toBe(10);
  });

  it('每种职务应有完整的字段 (id, name, icon, category, description, promptHint, examples)', () => {
    for (const role of CLASS_ROLES) {
      expect(role.id).toBeDefined();
      expect(role.name).toBeDefined();
      expect(role.icon).toBeDefined();
      expect(role.category).toBeDefined();
      expect(role.description).toBeDefined();
      expect(role.promptHint).toBeTypeOf('string');
      expect(Array.isArray(role.examples)).toBe(true);
    }
  });

  it('所有 ID 应唯一', () => {
    const ids = CLASS_ROLES.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('普通同学 的 promptHint 应为空字符串', () => {
    const ordinary = CLASS_ROLES.find((r) => r.id === 'ordinary_student');
    expect(ordinary).toBeDefined();
    expect(ordinary?.promptHint).toBe('');
    expect(ordinary?.examples).toEqual([]);
  });

  it('非普通同学角色都应有非空的 promptHint 和 examples', () => {
    const selectableRoles = getSelectableRoles();
    for (const role of selectableRoles) {
      expect(role.promptHint.length).toBeGreaterThan(0);
      expect(role.examples.length).toBeGreaterThan(0);
    }
  });

  it('ROLE_CATEGORIES 应包含5个分类', () => {
    expect(Object.keys(ROLE_CATEGORIES)).toHaveLength(5);
    expect(ROLE_CATEGORIES).toHaveProperty('leadership');
    expect(ROLE_CATEGORIES).toHaveProperty('academic');
    expect(ROLE_CATEGORIES).toHaveProperty('service');
    expect(ROLE_CATEGORIES).toHaveProperty('activity');
    expect(ROLE_CATEGORIES).toHaveProperty('general');
  });

  it('getRoleById 应返回正确的角色', () => {
    const monitor = getRoleById('class_monitor');
    expect(monitor).toBeDefined();
    expect(monitor?.name).toBe('班长');
    expect(monitor?.icon).toBe('👑');
    expect(monitor?.category).toBe('leadership');
  });

  it('getRoleById 对不存在的ID返回 undefined', () => {
    expect(getRoleById('nonexistent_role')).toBeUndefined();
  });

  it('getRolesByCategory 应按分类过滤正确数量', () => {
    const leadershipRoles = getRolesByCategory('leadership');
    expect(leadershipRoles.length).toBe(2); // 班长 + 组长
    expect(leadershipRoles.every((r) => r.category === 'leadership')).toBe(true);

    const academicRoles = getRolesByCategory('academic');
    expect(academicRoles.length).toBe(2); // 学习委员 + 课代表

    const generalRoles = getRolesByCategory('general');
    expect(generalRoles.length).toBe(1); // 普通同学
  });

  it('getSelectableRoles 应排除普通同学，返回9种可选职务', () => {
    const selectable = getSelectableRoles();
    expect(selectable.length).toBe(9);
    expect(selectable.find((r) => r.id === 'ordinary_student')).toBeUndefined();
  });

  it('领导职务分类应包含班长和组长', () => {
    const leadershipRoles = getRolesByCategory('leadership');
    const ids = leadershipRoles.map((r) => r.id);
    expect(ids).toContain('class_monitor');
    expect(ids).toContain('group_leader');
  });

  it('服务职务应包含纪律委员、卫生委员、劳动委员（3种）', () => {
    const serviceRoles = getRolesByCategory('service');
    expect(serviceRoles.length).toBe(3);
    const ids = serviceRoles.map((r) => r.id);
    expect(ids).toContain('discipline_commissar');
    expect(ids).toContain('hygiene_commissar');
    expect(ids).toContain('labor_commissar');
  });

  it('文体职务应包含文艺委员和体育委员', () => {
    const activityRoles = getRolesByCategory('activity');
    expect(activityRoles.length).toBe(2);
    const ids = activityRoles.map((r) => r.id);
    expect(ids).toContain('arts_commissar');
    expect(ids).toContain('sports_commissar');
  });
});
