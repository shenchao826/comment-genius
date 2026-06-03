import { describe, it, expect } from 'vitest';

function buildConversationSummary(conversations: any[], lang: 'zh' | 'en'): string {
  if (!conversations || conversations.length === 0) return '';

  const typeLabels: Record<string, { zh: string; en: string }> = {
    daily: { zh: '日常沟通', en: 'Daily Chat' },
    discipline: { zh: '纪律谈话', en: 'Discipline Talk' },
    praise: { zh: '表扬鼓励', en: 'Praise & Encouragement' },
    psychological: { zh: '心理疏导', en: 'Psychological Counseling' },
    goal: { zh: '目标规划', en: 'Goal Planning' },
  };

  const sorted = [...conversations].sort((a, b) =>
    (b.conversation_date || '').localeCompare(a.conversation_date || '')
  );

  const typeCounts: Record<string, number> = {};
  for (const c of sorted) {
    typeCounts[c.conversation_type] = (typeCounts[c.conversation_type] || 0) + 1;
  }

  const recentOnes = sorted.slice(0, 3);

  if (lang === 'zh') {
    const lines: string[] = [`【沟通谈心记录】`];
    lines.push(`- 累计谈话${conversations.length}次`);
    const typeNames = Object.entries(typeCounts)
      .map(([type, count]) => `${typeLabels[type]?.zh || type}${count}次`)
      .join('、');
    lines.push(`- 谈话类型分布：${typeNames}`);
    for (const c of recentOnes) {
      const typeName = typeLabels[c.conversation_type]?.zh || c.conversation_type;
      const dateStr = c.conversation_date ? `(${c.conversation_date})` : '';
      const summary = (c.content || '').slice(0, 80);
      lines.push(`- ${typeName}${dateStr}：${summary}${summary.length >= 80 ? '...' : ''}`);
    }
    if (conversations.length > 3) {
      lines.push(`- ...等共${conversations.length}条记录`);
    }
    return '\n' + lines.join('\n');
  } else {
    const lines: string[] = [`[Communication Records]`];
    lines.push(`- Total conversations: ${conversations.length}`);
    const typeNames = Object.entries(typeCounts)
      .map(([type, count]) => `${typeLabels[type]?.en || type}: ${count}`)
      .join(', ');
    lines.push(`- Type distribution: ${typeNames}`);
    for (const c of recentOnes) {
      const typeName = typeLabels[c.conversation_type]?.en || c.conversation_type;
      const dateStr = c.conversation_date ? `(${c.conversation_date})` : '';
      const summary = (c.content || '').slice(0, 80);
      lines.push(`- ${typeName}${dateStr}: ${summary}${summary.length >= 80 ? '...' : ''}`);
    }
    return '\n' + lines.join('\n');
  }
}

function buildHomeVisitSummary(visits: any[], lang: 'zh' | 'en'): string {
  if (!visits || visits.length === 0) return '';

  const typeLabels: Record<string, { zh: string; en: string }> = {
    in_person: { zh: '上门家访', en: 'In-Person Visit' },
    phone: { zh: '电话家访', en: 'Phone Call' },
    video: { zh: '视频家访', en: 'Video Call' },
    school_meeting: { zh: '到校面谈', en: 'School Meeting' },
  };

  const sorted = [...visits].sort((a, b) =>
    (b.visit_date || '').localeCompare(a.visit_date || '')
  );

  const recentOnes = sorted.slice(0, 3);

  if (lang === 'zh') {
    const lines: string[] = [`【家校联系记录】`];
    lines.push(`- 累计家访/面谈${visits.length}次`);
    for (const v of recentOnes) {
      const typeName = typeLabels[v.visit_type]?.zh || v.visit_type;
      const dateStr = v.visit_date ? `(${v.visit_date})` : '';
      const purpose = (v.visit_purpose || '').slice(0, 60);
      lines.push(`- ${typeName}${dateStr}：${purpose}${purpose.length >= 60 ? '...' : ''}`);
      if (v.consensus) {
        lines.push(`  → 达成共识：${v.consensus.slice(0, 50)}${v.consensus.length > 50 ? '...' : ''}`);
      }
    }
    if (visits.length > 3) {
      lines.push(`- ...等共${visits.length}条记录`);
    }
    return '\n' + lines.join('\n');
  } else {
    const lines: string[] = [`[Home-School Contact Records]`];
    lines.push(`- Total visits/meetings: ${visits.length}`);
    for (const v of recentOnes) {
      const typeName = typeLabels[v.visit_type]?.en || v.visit_type;
      const dateStr = v.visit_date ? `(${v.visit_date})` : '';
      const purpose = (v.visit_purpose || '').slice(0, 60);
      lines.push(`- ${typeName}${dateStr}: ${purpose}${purpose.length >= 60 ? '...' : ''}`);
      if (v.consensus) {
        lines.push(`  -> Consensus: ${v.consensus.slice(0, 50)}${v.consensus.length > 50 ? '...' : ''}`);
      }
    }
    return '\n' + lines.join('\n');
  }
}

describe('buildConversationSummary', () => {
  it('should return empty string for empty input', () => {
    expect(buildConversationSummary([], 'zh')).toBe('');
    expect(buildConversationSummary(undefined as any, 'zh')).toBe('');
    expect(buildConversationSummary(null as any, 'zh')).toBe('');
  });

  it('should generate Chinese summary with single record', () => {
    const result = buildConversationSummary([{
      conversation_type: 'praise',
      content: '该生本次数学考试进步明显，从70分提升到88分',
      conversation_date: '2026-05-20',
    }], 'zh');

    expect(result).toContain('【沟通谈心记录】');
    expect(result).toContain('累计谈话1次');
    expect(result).toContain('表扬鼓励1次');
    expect(result).toContain('该生本次数学考试进步明显');
  });

  it('should generate English summary', () => {
    const result = buildConversationSummary([{
      conversation_type: 'discipline',
      content: 'Student was late 3 times this week',
      conversation_date: '2026-05-15',
    }], 'en');

    expect(result).toContain('[Communication Records]');
    expect(result).toContain('Total conversations: 1');
    expect(result).toContain('Discipline Talk');
  });

  it('should handle multiple types and count correctly', () => {
    const result = buildConversationSummary([
      { conversation_type: 'daily', content: 'a', conversation_date: '2026-01-01' },
      { conversation_type: 'daily', content: 'b', conversation_date: '2026-01-02' },
      { conversation_type: 'discipline', content: 'c', conversation_date: '2026-01-03' },
      { conversation_type: 'praise', content: 'd', conversation_date: '2026-01-04' },
    ], 'zh');

    expect(result).toContain('累计谈话4次');
    expect(result).toContain('日常沟通2次');
    expect(result).toContain('纪律谈话1次');
    expect(result).toContain('表扬鼓励1次');
  });

  it('should show only latest 3 records in detail', () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      conversation_type: 'daily',
      content: `conversation content number ${i + 1}`,
      conversation_date: `2026-0${i + 1}-15`,
    }));
    const result = buildConversationSummary(records, 'zh');

    expect(result).toContain('累计谈话5次');
    expect(result).toContain('...等共5条记录');
    expect(result).toContain('conversation content number 5');
    expect(result).not.toContain('conversation content number 2');
  });

  it('should sort by date descending', () => {
    const result = buildConversationSummary([
      { conversation_type: 'goal', content: 'old', conversation_date: '2026-01-01' },
      { conversation_type: 'psychological', content: 'new', conversation_date: '2026-06-02' },
    ], 'zh');

    const newIdx = result.indexOf('new');
    const oldIdx = result.indexOf('old');
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('should truncate long content to 80 chars', () => {
    const longContent = 'x'.repeat(100);
    const result = buildConversationSummary([{
      conversation_type: 'daily',
      content: longContent,
      conversation_date: '2026-05-20',
    }], 'zh');

    expect(result).toContain('...');
  });
});

describe('buildHomeVisitSummary', () => {
  it('should return empty string for empty input', () => {
    expect(buildHomeVisitSummary([], 'zh')).toBe('');
    expect(buildHomeVisitSummary(undefined as any, 'en')).toBe('');
  });

  it('should generate Chinese summary with single visit', () => {
    const result = buildHomeVisitSummary([{
      visit_type: 'in_person',
      visit_purpose: '了解家庭学习环境，反馈期中考试成绩',
      visit_date: '2026-05-18',
    }], 'zh');

    expect(result).toContain('【家校联系记录】');
    expect(result).toContain('累计家访/面谈1次');
    expect(result).toContain('上门家访');
    expect(result).toContain('了解家庭学习环境');
  });

  it('should include consensus when present', () => {
    const result = buildHomeVisitSummary([{
      visit_type: 'phone',
      visit_purpose: '反馈近期表现',
      consensus: '家长承诺每日检查作业并签名',
      visit_date: '2026-06-01',
    }], 'zh');

    expect(result).toContain('达成共识');
    expect(result).toContain('家长承诺每日检查作业并签名');
  });

  it('should generate English summary', () => {
    const result = buildHomeVisitSummary([{
      visit_type: 'video',
      visit_purpose: 'Discuss online learning progress',
      visit_date: '2026-05-10',
    }], 'en');

    expect(result).toContain('[Home-School Contact Records]');
    expect(result).toContain('Total visits/meetings: 1');
    expect(result).toContain('Video Call');
  });

  it('should handle all 4 visit types', () => {
    const types = ['in_person', 'phone', 'video', 'school_meeting'] as const;
    const results = types.map(type =>
      buildHomeVisitSummary([{ visit_type: type, visit_purpose: 'test', visit_date: '2026-01-01' }], 'zh')
    );

    expect(results[0]).toContain('上门家访');
    expect(results[1]).toContain('电话家访');
    expect(results[2]).toContain('视频家访');
    expect(results[3]).toContain('到校面谈');
  });

  it('should truncate long purpose to 60 chars', () => {
    const longPurpose = 'y'.repeat(80);
    const result = buildHomeVisitSummary([{
      visit_type: 'phone',
      visit_purpose: longPurpose,
      visit_date: '2026-05-20',
    }], 'zh');

    expect(result).toContain('...');
  });

  it('should truncate long consensus to 50 chars', () => {
    const longConsensus = 'z'.repeat(70);
    const result = buildHomeVisitSummary([{
      visit_type: 'school_meeting',
      visit_purpose: 'test',
      consensus: longConsensus,
      visit_date: '2026-06-01',
    }], 'zh');

    expect(result).toContain('...');
  });

  it('should show only latest 3 records', () => {
    const records = Array.from({ length: 5 }, (_, i) => ({
      visit_type: 'phone',
      visit_purpose: `visit purpose ${i + 1}`,
      visit_date: `2026-0${i + 1}-10`,
    }));
    const result = buildHomeVisitSummary(records, 'zh');

    expect(result).toContain('累计家访/面谈5次');
    expect(result).toContain('...等共5条记录');
  });
});

function buildBehaviorSummary(behaviors: any[], lang: 'zh' | 'en'): string {
  if (!behaviors || behaviors.length === 0) return '';

  const typeLabels: Record<string, { zh: string; en: string }> = {
    praise: { zh: '表扬', en: 'Praise' },
    warning: { zh: '提醒', en: 'Warning' },
    punishment: { zh: '惩罚', en: 'Punishment' },
  };

  const sorted = [...behaviors].sort((a, b) =>
    (b.record_date || '').localeCompare(a.record_date || '')
  );

  const typeCounts: Record<string, number> = {};
  let totalPoints = 0;
  for (const b of sorted) {
    typeCounts[b.behavior_type] = (typeCounts[b.behavior_type] || 0) + 1;
    totalPoints += b.points || 0;
  }

  const recentOnes = sorted.slice(0, 5);
  const tagList: string[] = [];
  for (const b of recentOnes) {
    if (b.behavior_tag) tagList.push(b.behavior_tag);
  }

  if (lang === 'zh') {
    const lines: string[] = [`【行为表现记录】`];
    lines.push(`- 累计记录${behaviors.length}条，积分变动：${totalPoints >= 0 ? '+' : ''}${totalPoints}`);
    const typeNames = Object.entries(typeCounts)
      .map(([type, count]) => `${typeLabels[type]?.zh || type}${count}次`)
      .join('、');
    lines.push(`- 行为分布：${typeNames}`);
    if (tagList.length > 0) {
      lines.push(`- 近期标签：${tagList.join('、')}`);
    }
    return '\n' + lines.join('\n');
  } else {
    const lines: string[] = [`[Behavior Records]`];
    lines.push(`- Total records: ${behaviors.length}, Points change: ${totalPoints >= 0 ? '+' : ''}${totalPoints}`);
    const typeNames = Object.entries(typeCounts)
      .map(([type, count]) => `${typeLabels[type]?.en || type}: ${count}`)
      .join(', ');
    lines.push(`- Distribution: ${typeNames}`);
    if (tagList.length > 0) {
      lines.push(`- Recent tags: ${tagList.join(', ')}`);
    }
    return '\n' + lines.join('\n');
  }
}

describe('buildBehaviorSummary', () => {
  it('should return empty string for empty input', () => {
    expect(buildBehaviorSummary([], 'zh')).toBe('');
    expect(buildBehaviorSummary(undefined as any, 'zh')).toBe('');
    expect(buildBehaviorSummary(null as any, 'en')).toBe('');
  });

  it('should generate Chinese summary with single record', () => {
    const result = buildBehaviorSummary([{
      behavior_type: 'praise',
      behavior_tag: '积极发言',
      points: 1,
      record_date: '2026-05-20',
    }], 'zh');

    expect(result).toContain('【行为表现记录】');
    expect(result).toContain('累计记录1条');
    expect(result).toContain('积分变动：+1');
    expect(result).toContain('表扬1次');
    expect(result).toContain('近期标签：积极发言');
  });

  it('should generate English summary', () => {
    const result = buildBehaviorSummary([{
      behavior_type: 'warning',
      behavior_tag: '上课走神',
      points: -1,
      record_date: '2026-05-15',
    }], 'en');

    expect(result).toContain('[Behavior Records]');
    expect(result).toContain('Total records: 1');
    expect(result).toContain('Points change: -1');
    expect(result).toContain('Warning');
  });

  it('should handle all 3 behavior types with counts', () => {
    const result = buildBehaviorSummary([
      { behavior_type: 'praise', behavior_tag: 'a', points: 1, record_date: '2026-01-01' },
      { behavior_type: 'praise', behavior_tag: 'b', points: 1, record_date: '2026-01-02' },
      { behavior_type: 'warning', behavior_tag: 'c', points: -1, record_date: '2026-01-03' },
      { behavior_type: 'punishment', behavior_tag: 'd', points: -2, record_date: '2026-01-04' },
    ], 'zh');

    expect(result).toContain('累计记录4条');
    expect(result).toContain('表扬2次');
    expect(result).toContain('提醒1次');
    expect(result).toContain('惩罚1次');
  });

  it('should calculate total points correctly', () => {
    const result = buildBehaviorSummary([
      { behavior_type: 'praise', behavior_tag: 'a', points: 2, record_date: '2026-01-01' },
      { behavior_type: 'praise', behavior_tag: 'b', points: 1, record_date: '2026-01-02' },
      { behavior_type: 'warning', behavior_tag: 'c', points: -1, record_date: '2026-01-03' },
    ], 'zh');

    expect(result).toContain('积分变动：+2');
  });

  it('should show negative total points', () => {
    const result = buildBehaviorSummary([
      { behavior_type: 'punishment', behavior_tag: 'a', points: -3, record_date: '2026-01-01' },
    ], 'zh');

    expect(result).toContain('积分变动：-3');
  });

  it('should show latest 5 tags in recent tags section', () => {
    const behaviors = Array.from({ length: 7 }, (_, i) => ({
      behavior_type: 'praise',
      behavior_tag: `标签${i + 1}`,
      points: 1,
      record_date: `2026-0${Math.floor(i / 30) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    const result = buildBehaviorSummary(behaviors, 'zh');

    expect(result).toContain('标签7');
    expect(result).toContain('标签3');
    expect(result).not.toContain('标签2');
    expect(result).not.toContain('标签1');
  });

  it('should sort by date descending', () => {
    const result = buildBehaviorSummary([
      { behavior_type: 'praise', behavior_tag: '旧', points: 1, record_date: '2026-01-01' },
      { behavior_type: 'praise', behavior_tag: '新', points: 1, record_date: '2026-06-02' },
    ], 'zh');

    const newIdx = result.indexOf('新');
    const oldIdx = result.indexOf('旧');
    expect(newIdx).toBeLessThan(oldIdx);
  });

  it('should handle missing points gracefully', () => {
    const result = buildBehaviorSummary([{
      behavior_type: 'praise',
      behavior_tag: '测试',
      record_date: '2026-05-20',
    }], 'zh');

    expect(result).toContain('累计记录1条');
    expect(result).toContain('积分变动：+0');
  });

  it('should not show recent tags when all items have no tag', () => {
    const result = buildBehaviorSummary([{
      behavior_type: 'warning',
      description: '无标签记录',
      points: -1,
      record_date: '2026-05-20',
    }], 'zh');

    expect(result).toContain('累计记录1条');
    expect(result).not.toContain('近期标签');
  });
});
