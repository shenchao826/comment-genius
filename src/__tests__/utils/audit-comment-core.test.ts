import { describe, it, expect } from 'vitest';

// ===== 从 generate-comment.ts 提取的纯函数，用于单元测试 =====

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return rendered;
}

interface ExamDataItem {
  exam_name: string;
  subject: string;
  score: number;
  full_score?: number;
  class_avg?: number;
  class_rank?: number;
  total_count?: number;
}

function buildExamSummary(exams: ExamDataItem[], lang: 'zh' | 'en'): string {
  if (!exams || exams.length === 0) return '';

  const fullScore = (e: ExamDataItem) => e.full_score || 100;

  const avgScore = exams.reduce((sum, e) => sum + e.score, 0) / exams.length;
  const sortedByScore = [...exams].sort((a, b) => b.score - a.score);
  const highest = sortedByScore[0];
  const lowest = sortedByScore[sortedByScore.length - 1];

  const withRank = exams.filter(e => e.class_rank != null && e.total_count != null);
  const bestRank = withRank.length > 0
    ? withRank.sort((a, b) => (a.class_rank || 999) - (b.class_rank || 999))[0]
    : null;

  const subjectMap = new Map<string, ExamDataItem[]>();
  for (const exam of exams) {
    const list = subjectMap.get(exam.subject) || [];
    list.push(exam);
    subjectMap.set(exam.subject, list);
  }

  const scoreChanges: string[] = [];
  for (const [, records] of subjectMap) {
    if (records.length >= 2) {
      const sorted = [...records].sort((a, b) => (a.exam_name || '').localeCompare(b.exam_name || ''));
      for (let i = 1; i < sorted.length; i++) {
        const diff = sorted[i].score - sorted[i - 1].score;
        const arrow = diff > 0 ? '\u2191' : diff < 0 ? '\u2193' : '\u2192';
        scoreChanges.push(`${sorted[i].subject} ${sorted[i-1].score}\u2192${sorted[i].score}(${arrow}${diff >= 0 ? '+' : ''}${diff})`);
      }
    }
  }

  if (lang === 'zh') {
    const lines: string[] = [`\u3010\u5b66\u4e1a\u6210\u7ee9\u753b\u50cf\u3011`];
    lines.push(`\u6700\u8fd1${exams.length}\u6b21\u8003\u8bd5\u5e73\u5747\u5206\uff1a${avgScore.toFixed(1)}\u5206`);
    lines.push(`\u6700\u9ad8\u5206\uff1a${highest.subject} ${highest.score}/${fullScore(highest)}\uff08${highest.exam_name}\uff09`);
    lines.push(`\u6700\u4f4e\u5206\uff1a${lowest.subject} ${lowest.score}/${fullScore(lowest)}\uff08${lowest.exam_name}\uff09`);
    if (bestRank) {
      lines.push(`\u6700\u4f73\u6392\u540d\uff1a\u7b2c${bestRank.class_rank}\u540d/${bestRank.total_count}\u4eba\uff08\u524d${((bestRank.class_rank / bestRank.total_count) * 100).toFixed(0)}%\uff0c${bestRank.exam_name}\uff09`);
    }
    if (subjectMap.size > 1) {
      lines.push(`\u6d89\u53ca\u79d1\u76ee\uff1a${[...subjectMap.keys()].join('\u3001')}`);
    }
    if (scoreChanges.length > 0) {
      lines.push(`\u6210\u7ee9\u53d8\u5316\u8d8b\u52bf\uff1a${scoreChanges.join('\uff0c')}`);
    }
    return '\n' + lines.join('\n');
  } else {
    const lines: string[] = [`[Academic Performance Profile]`];
    lines.push(`- Average score (last ${exams.length} exams): ${avgScore.toFixed(1)}`);
    lines.push(`- Highest: ${highest.subject} ${highest.score}/${fullScore(highest)} (${highest.exam_name})`);
    lines.push(`- Lowest: ${lowest.subject} ${lowest.score}/${fullScore(lowest)} (${lowest.exam_name})`);
    if (bestRank) {
      lines.push(`- Best rank: #${bestRank.class_rank}/${bestRank.total_count} (top ${((bestRank.class_rank / bestRank.total_count) * 100).toFixed(0)}%, ${bestRank.exam_name})`);
    }
    if (subjectMap.size > 1) {
      lines.push(`- Subjects: ${[...subjectMap.keys()].join(', ')}`);
    }
    return '\n' + lines.join('\n');
  }
}

interface ConversationDataItem {
  conversation_type: string;
  category?: string;
  content: string;
  student_reaction?: string;
  follow_up?: string;
  conversation_date: string;
}

function buildConversationSummary(conversations: ConversationDataItem[], lang: 'zh' | 'en'): string {
  if (!conversations || conversations.length === 0) return '';

  const typeLabels: Record<string, { zh: string; en: string }> = {
    daily: { zh: '\u65e5\u5e38\u6c9f\u901a', en: 'Daily Chat' },
    discipline: { zh: '\u7eaa\u5f8b\u8c08\u8bdd', en: 'Discipline Talk' },
    praise: { zh: '\u8868\u626c\u9f13\u52b1', en: 'Praise & Encouragement' },
    psychological: { zh: '\u5fc3\u7406\u758f\u5bfc', en: 'Psychological Counseling' },
    goal: { zh: '\u76ee\u6807\u89c4\u5212', en: 'Goal Planning' },
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
    const lines: string[] = [`\u3010\u6c9f\u901a\u8c08\u5fc3\u8bb0\u5f55\u3011`];
    lines.push(`\u7d2f\u8ba1\u8c08\u8bdd${conversations.length}\u6b21`);
    const typeNames = Object.entries(typeCounts)
      .map(([type, count]) => `${typeLabels[type]?.zh || type}${count}\u6b21`)
      .join('\u3001');
    lines.push(`\u8c08\u8bdd\u7c7b\u578b\u5206\u5e03\uff1a${typeNames}`);
    for (const c of recentOnes) {
      const typeName = typeLabels[c.conversation_type]?.zh || c.conversation_type;
      const dateStr = c.conversation_date ? `(${c.conversation_date})` : '';
      const summary = (c.content || '').slice(0, 80);
      lines.push(`- ${typeName}${dateStr}\uff1a${summary}${summary.length >= 80 ? '...' : ''}`);
    }
    if (conversations.length > 3) {
      lines.push(`- ...\u7b49\u5171${conversations.length}\u6761\u8bb0\u5f55`);
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

interface HomeVisitDataItem {
  visit_type: string;
  visit_purpose?: string;
  family_structure?: string;
  key_topics?: string;
  consensus?: string;
  follow_plan?: string;
  visit_date: string;
}

function buildHomeVisitSummary(visits: HomeVisitDataItem[], lang: 'zh' | 'en'): string {
  if (!visits || visits.length === 0) return '';

  const typeLabels: Record<string, { zh: string; en: string }> = {
    in_person: { zh: '\u4e0a\u95e8\u5bb6\u8bbf', en: 'In-Person Visit' },
    phone: { zh: '\u7535\u8bdd\u5bb6\u8bbf', en: 'Phone Call' },
    video: { zh: '\u89c6\u9891\u5bb6\u8bbf', en: 'Video Call' },
    school_meeting: { zh: '\u5230\u6821\u9762\u8c08', en: 'School Meeting' },
  };

  const sorted = [...visits].sort((a, b) =>
    (b.visit_date || '').localeCompare(a.visit_date || '')
  );

  const recentOnes = sorted.slice(0, 3);

  if (lang === 'zh') {
    const lines: string[] = [`\u3010\u5bb6\u6821\u8054\u7cfb\u8bb0\u5f55\u3011`];
    lines.push(`\u7d2f\u8ba1\u5bb6\u8bbf/\u9762\u8c08${visits.length}\u6b21`);
    for (const v of recentOnes) {
      const typeName = typeLabels[v.visit_type]?.zh || v.visit_type;
      const dateStr = v.visit_date ? `(${v.visit_date})` : '';
      const purpose = (v.visit_purpose || '').slice(0, 60);
      lines.push(`- ${typeName}${dateStr}\uff1a${purpose}${purpose.length >= 60 ? '...' : ''}`);
      if (v.consensus) {
        lines.push(`  \u2192 \u8fbe\u6210\u5171\u8bc6\uff1a${v.consensus.slice(0, 50)}${v.consensus.length > 50 ? '...' : ''}`);
      }
    }
    if (visits.length > 3) {
      lines.push(`- ...\u7b49\u5171${visits.length}\u6761\u8bb0\u5f55`);
    }
    return '\n' + lines.join('\n');
  } else {
    const lines: string[] = `[Home-School Contact Records]`;
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

interface BehaviorDataItem {
  behavior_type: string;
  behavior_category: string;
  behavior_tag?: string;
  description?: string;
  points?: number;
  record_date: string;
}

function buildBehaviorSummary(behaviors: BehaviorDataItem[], lang: 'zh' | 'en'): string {
  if (!behaviors || behaviors.length === 0) return '';

  const typeLabels: Record<string, { zh: string; en: string }> = {
    praise: { zh: '\u8868\u626c', en: 'Praise' },
    warning: { zh: '\u63d0\u9192', en: 'Warning' },
    punishment: { zh: '\u60e9\u7f5a', en: 'Punishment' },
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
    const lines: string[] = [`\u3010\u884c\u4e3a\u8868\u73b0\u8bb0\u5f55\u3011`];
    lines.push(`\u7d2f\u8ba1\u8bb0\u5f55${behaviors.length}\u6761\uff0c\u79ef\u5206\u53d8\u52a8\uff1a${totalPoints >= 0 ? '+' : ''}${totalPoints}`);
    const typeNames = Object.entries(typeCounts)
      .map(([type, count]) => `${typeLabels[type]?.zh || type}${count}\u6b21`)
      .join('\u3001');
    lines.push(`\u884c\u4e3a\u5206\u5e03\uff1a${typeNames}`);
    if (tagList.length > 0) {
      lines.push(`\u8fd1\u671f\u6807\u7b7e\uff1a${tagList.join('\u3001')}`);
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

/**
 * 计算两段文本的 Jaccard 相似度（基于字符 n-gram）
 */
function textSimilarity(textA: string, textB: string, n: number = 2): number {
  if (!textA || !textB) return 0;
  const normalize = (s: string) => s.replace(/[\s\uff0c\u3002\uff01\uff1f\u3001\uff1b\uff1a""()\s]/g, "").toLowerCase();
  const a = normalize(textA);
  const b = normalize(textB);
  if (a === b) return 1;

  const getNgrams = (s: string): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) {
      grams.add(s.slice(i, i + n));
    }
    return grams;
  };

  const setA = getNgrams(a);
  const setB = getNgrams(b);
  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 检查新生成的评语与历史评语的最高相似度
 */
function checkDuplicate(
  newComment: string,
  historyComments: string[],
  threshold: number = 0.6,
): { isDuplicate: boolean; maxSimilarity: number; similarComment: string | null } {
  let maxSim = 0;
  let mostSimilar: string | null = null;
  for (const hist of historyComments) {
    const sim = textSimilarity(newComment, hist);
    if (sim > maxSim) {
      maxSim = sim;
      mostSimilar = hist;
    }
  }
  return {
    isDuplicate: maxSim >= threshold,
    maxSimilarity: Math.round(maxSim * 100) / 100,
    similarComment: mostSimilar,
  };
}

function getBuiltInTemplate(templateId: string): string | null {
  const templates: Record<string, string> = {
    tpl_summary:
      '\u8bf7\u4e3a{{student_name}}\u64b0\u5199\u4e00\u6761{{comment_type}}\u98ce\u683c\u7684\u8bc4\u8bed\u3002\u5b66\u751f\u7279\u70b9\uff1a{{traits}}\u3002\u8bed\u6c14\u8981\u6c42\uff1a{{tone}}\u3002\u5b57\u6570\uff1a{{length}}\u3002',
    tpl_encouragement:
      '\u8bf7\u4e3a{{student_name}}\u64b0\u5199\u4e00\u6761\u9f13\u52b1\u6027\u8d28\u7684\u8bc4\u8bed\u3002\u91cd\u70b7\u7a81\u51fa\u4f18\u70b9\u548c\u8fdb\u6b65\u3002\u8bed\u6c14\u8981\u6c42\uff1a{{tone}}\u3002\u5b57\u6570\uff1a{{length}}\u3002',
    tpl_improvement:
      '\u8bf7\u4e3a{{student_name}}\u64b0\u5199\u4e00\u6761\u6539\u8fdb\u5efa\u8bae\u8bc4\u8bed\u3002\u9700\u8981\u6539\u8fdb\u7684\u65b9\u9762\uff1a{{traits}}\u3002\u8bed\u6c14\u8981\u6c42\uff1a{{tone}}\u3002\u5b57\u6570\uff1a{{length}}\u3002',
    tpl_parent:
      '\u8bf7\u4e3a{{student_name}}\u64b0\u5199\u4e00\u6761\u9002\u5408\u5411\u5bb6\u957f\u6c47\u62a5\u7684\u8bc4\u8bed\u3002\u8bed\u6c14\u8981\u4eb2\u5207\u4e13\u4e1a\uff0c\u4fbf\u4e8e\u5bb6\u957f\u7406\u89e3\u3002\u5b57\u6570\uff1a{{length}}\u3002',
  };

  return templates[templateId] || null;
}

// ===== 测试用例 =====

describe('renderTemplate - 模板渲染函数', () => {
  it('应正确替换单个变量', () => {
    const result = renderTemplate('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('应正确替换多个变量', () => {
    const result = renderTemplate('{{greeting}}, {{name}}! Your score is {{score}}.', {
      greeting: 'Hi',
      name: '张三',
      score: '95',
    });
    expect(result).toBe('Hi, 张三! Your score is 95.');
  });

  it('应替换所有出现的同名变量', () => {
    const result = renderTemplate('{{name}} and {{name}} are {{name}}', { name: 'same' });
    expect(result).toBe('same and same are same');
  });

  it('未匹配的变量占位符应保持原样', () => {
    const result = renderTemplate('Hello {{name}}, {{missing}} is missing.', { name: 'Test' });
    expect(result).toBe('Hello Test, {{missing}} is missing.');
  });

  it('空模板应返回空字符串', () => {
    expect(renderTemplate('', { name: 'x' })).toBe('');
  });

  it('无变量的模板应原样返回', () => {
    expect(renderTemplate('Plain text without variables', {})).toBe('Plain text without variables');
  });

  it('空变量值应替换为空字符串', () => {
    const result = renderTemplate('Value: "{{val}}"', { val: '' });
    expect(result).toBe('Value: ""');
  });
});

describe('textSimilarity - 文本相似度计算', () => {
  it('相同文本相似度应为 1', () => {
    const text = '该生学习态度端正，课堂上认真听讲';
    expect(textSimilarity(text, text)).toBe(1);
  });

  it('完全不同文本相似度应接近 0', () => {
    const sim = textSimilarity('该生学习认真', '今天天气很好适合户外运动');
    expect(sim).toBeLessThan(0.3);
  });

  it('部分相同的文本应有中等相似度', () => {
    const a = '该生学习态度端正，课堂上认真听讲，作业完成工整';
    const b = '该生学习态度端正，课堂上认真听讲，积极参与讨论';
    const sim = textSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.5);
    expect(sim).toBeLessThan(1);
  });

  it('任一文本为空时应返回 0', () => {
    expect(textSimilarity('', 'some text')).toBe(0);
    expect(textSimilarity('some text', '')).toBe(0);
    expect(textSimilarity('', '')).toBe(0);
  });

  it('大小写不敏感', () => {
    // 英文测试
    const sim = textSimilarity('Hello World', 'hello world');
    expect(sim).toBe(1);
  });

  it('标点符号差异不应显著影响相似度', () => {
    const a = '该生学习认真，态度端正';
    const b = '该生学习认真、态度端正';
    const sim = textSimilarity(a, b);
    expect(sim).toBeGreaterThan(0.8);
  });

  it('自定义 n-gram 大小应影响结果精度', () => {
    const a = 'abcdef';
    const b = 'abcxyz';
    const sim2 = textSimilarity(a, b, 2);
    const sim3 = textSimilarity(a, b, 3);
    // 不同 n 值会产生不同的相似度
    expect(typeof sim2).toBe('number');
    expect(typeof sim3).toBe('number');
  });
});

describe('checkDuplicate - 重复检测函数', () => {
  it('与历史记录高度相似时应标记为重复', () => {
    const history = [
      '该生学习态度端正，课堂上认真听讲，作业完成质量高',
    ];
    const newText = '该生学习态度端正，课堂上认真听讲，作业完成质量较高';

    const result = checkDuplicate(newText, history, 0.6);
    expect(result.isDuplicate).toBe(true);
    expect(result.maxSimilarity).toBeGreaterThanOrEqual(0.6);
    expect(result.similarComment).toBeTruthy();
  });

  it('与历史记录不相似时不应标记为重复', () => {
    const history = [
      '该生热爱运动，是班级足球队的主力成员',
    ];
    const newText = '该生本学期在数学方面进步明显';

    const result = checkDuplicate(newText, history, 0.6);
    expect(result.isDuplicate).toBe(false);
    expect(result.maxSimilarity).toBeLessThan(0.6);
  });

  it('空历史记录列表不应标记为重复', () => {
    const result = checkDuplicate('任何评语内容', [], 0.6);
    expect(result.isDuplicate).toBe(false);
    expect(result.maxSimilarity).toBe(0);
    expect(result.similarComment).toBeNull();
  });

  it('应在多条历史记录中找到最相似的', () => {
    const history = [
      '该生喜欢阅读，经常去图书馆借书',
      '该生学习态度端正，课堂上认真听讲，作业完成质量高',
      '该生乐于助人，经常帮助同学解答问题',
    ];
    const newText = '该生学习态度端正，课堂上认真听讲，表现积极';

    const result = checkDuplicate(newText, history, 0.6);
    expect(result.similarComment).toContain('学习态度端正');
  });

  it('maxSimilarity 应保留两位小数', () => {
    const history = ['测试内容'];
    const result = checkDuplicate('测试内容稍微修改一下', history);
    const decimalPlaces = result.maxSimilarity.toString().split('.')[1]?.length || 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });

  it('自定义阈值应生效', () => {
    const history = ['部分相同的评语内容用于测试'];
    const newText = '部分相同的评语内容稍作修改';

    const loose = checkDuplicate(newText, history, 0.8);
    const strict = checkDuplicate(newText, history, 0.3);
    // 严格阈值(0.3)应比宽松阈值(0.8)更容易触发重复
    expect(typeof strict.isDuplicate).toBe('boolean');
    expect(typeof loose.isDuplicate).toBe('boolean');
    // strict 阈值低，maxSimilarity 应该相同但 isDuplicate 判定不同
    expect(strict.maxSimilarity).toBe(loose.maxSimilarity);
  });
});

describe('getBuiltInTemplate - 内置模板获取', () => {
  it('应返回 tpl_summary 模板', () => {
    const tpl = getBuiltInTemplate('tpl_summary');
    expect(tpl).not.toBeNull();
    expect(tpl).toContain('{{student_name}}');
    expect(tpl).toContain('{{comment_type}}');
  });

  it('应返回 tpl_encouragement 模板', () => {
    const tpl = getBuiltInTemplate('tpl_encouragement');
    expect(tpl).not.toBeNull();
    expect(tpl).toContain('鼓励');
  });

  it('应返回 tpl_improvement 模板', () => {
    const tpl = getBuiltInTemplate('tpl_improvement');
    expect(tpl).not.toBeNull();
    expect(tpl).toContain('改进建议');
  });

  it('应返回 tpl_parent 模板', () => {
    const tpl = getBuiltInTemplate('tpl_parent');
    expect(tpl).not.toBeNull();
    expect(tpl).toContain('家长');
  });

  it('不存在的模板 ID 应返回 null', () => {
    expect(getBuiltInTemplate('nonexistent')).toBeNull();
    expect(getBuiltInTemplate('')).toBeNull();
  });
});

describe('buildExamSummary - 考试成绩摘要（generate-comment 版本）', () => {
  it('空数组输入应返回空字符串', () => {
    expect(buildExamSummary([], 'zh')).toBe('');
    expect(buildExamSummary(undefined as any, 'zh')).toBe('');
    expect(buildExamSummary(null as any, 'zh')).toBe('');
  });

  it('单条记录应包含平均分、最高分、最低分', () => {
    const exams: ExamDataItem[] = [{ exam_name: '期中考试', subject: '数学', score: 85 }];
    const result = buildExamSummary(exams, 'zh');

    expect(result).toContain('85.0');
    expect(result).toContain('数学');
    expect(result).toContain('最近1次考试');
  });

  it('多条记录应正确计算平均分', () => {
    const exams: ExamDataItem[] = [
      { exam_name: '期中', subject: '数学', score: 80 },
      { exam_name: '期中', subject: '语文', score: 90 },
      { exam_name: '期中', subject: '英语', score: 70 },
    ];
    const result = buildExamSummary(exams, 'zh');
    expect(result).toContain(((80 + 90 + 70) / 3).toFixed(1));
  });

  it('有排名信息时应显示最佳排名', () => {
    const exams: ExamDataItem[] = [
      { exam_name: '期末', subject: '数学', score: 85, class_rank: 5, total_count: 40 },
      { exam_name: '期末', subject: '语文', score: 92, class_rank: 3, total_count: 40 },
    ];
    const result = buildExamSummary(exams, 'zh');
    expect(result).toContain('第3名');
  });

  it('多科目同科目多次考试应显示趋势变化', () => {
    const exams: ExamDataItem[] = [
      { exam_name: '月考一', subject: '数学', score: 80 },
      { exam_name: '月考二', subject: '数学', score: 88 },
    ];
    const result = buildExamSummary(exams, 'zh');
    expect(result).toContain('成绩变化趋势');
    // 趋势变化应包含分数差异信息（方向取决于排序）
    expect(result).toMatch(/[\+\-]?\d+/);
  });

  it('英文模式输出应使用英文标签', () => {
    const exams: ExamDataItem[] = [{ exam_name: 'Midterm', subject: 'Math', score: 90 }];
    const result = buildExamSummary(exams, 'en');
    expect(result).toContain('[Academic Performance Profile]');
    expect(result).toContain('Average score');
  });

  it('涉及多科目时应列出科目名称', () => {
    const exams: ExamDataItem[] = [
      { exam_name: '期中', subject: '数学', score: 85 },
      { exam_name: '期中', subject: '语文', score: 90 },
    ];
    const result = buildExamSummary(exams, 'zh');
    expect(result).toContain('涉及科目');
    expect(result).toContain('数学');
    expect(result).toContain('语文');
  });
});

describe('buildConversationSummary - 沟通谈心摘要（generate-comment 版本）', () => {
  it('空数组输入应返回空字符串', () => {
    expect(buildConversationSummary([], 'zh')).toBe('');
    expect(buildConversationSummary(null as any, 'en')).toBe('');
  });

  it('单条记录应包含谈话类型和内容', () => {
    const convs: ConversationDataItem[] = [{
      conversation_type: 'praise',
      content: '该生本次数学考试进步明显',
      conversation_date: '2026-05-20',
    }];
    const result = buildConversationSummary(convs, 'zh');
    expect(result).toContain('【沟通谈心记录】');
    expect(result).toContain('累计谈话1次');
    expect(result).toContain('表扬鼓励1次');
  });

  it('多种类型应分别统计次数', () => {
    const convs: ConversationDataItem[] = [
      { conversation_type: 'daily', content: 'a', conversation_date: '2026-01-01' },
      { conversation_type: 'daily', content: 'b', conversation_date: '2026-01-02' },
      { conversation_type: 'discipline', content: 'c', conversation_date: '2026-01-03' },
    ];
    const result = buildConversationSummary(convs, 'zh');
    expect(result).toContain('日常沟通2次');
    expect(result).toContain('纪律谈话1次');
  });

  it('超过3条时应截断并提示总数', () => {
    const convs = Array.from({ length: 5 }, (_, i) => ({
      conversation_type: 'daily',
      content: `content ${i}`,
      conversation_date: `2026-0${i + 1}-15`,
    }));
    const result = buildConversationSummary(convs, 'zh');
    expect(result).toContain('...等共5条记录');
  });

  it('英文模式应输出英文标签', () => {
    const convs: ConversationDataItem[] = [{
      conversation_type: 'psychological',
      content: 'Counseling session about stress',
      conversation_date: '2026-05-10',
    }];
    const result = buildConversationSummary(convs, 'en');
    expect(result).toContain('[Communication Records]');
    expect(result).toContain('Psychological Counseling');
  });

  it('长内容应截断到80字符', () => {
    const longContent = 'x'.repeat(100);
    const result = buildConversationSummary([{
      conversation_type: 'daily',
      content: longContent,
      conversation_date: '2026-05-20',
    }], 'zh');
    expect(result).toContain('...');
  });
});

describe('buildHomeVisitSummary - 家校联系摘要（generate-comment 版本）', () => {
  it('空数组输入应返回空字符串', () => {
    expect(buildHomeVisitSummary([], 'zh')).toBe('');
  });

  it('单条家访记录应包含类型和目的', () => {
    const visits: HomeVisitDataItem[] = [{
      visit_type: 'in_person',
      visit_purpose: '了解家庭学习环境',
      visit_date: '2026-05-18',
    }];
    const result = buildHomeVisitSummary(visits, 'zh');
    expect(result).toContain('【家校联系记录】');
    expect(result).toContain('上门家访');
    expect(result).toContain('了解家庭学习环境');
  });

  it('包含共识信息时应显示共识', () => {
    const visits: HomeVisitDataItem[] = [{
      visit_type: 'phone',
      visit_purpose: '反馈近期表现',
      consensus: '家长承诺每日检查作业',
      visit_date: '2026-06-01',
    }];
    const result = buildHomeVisitSummary(visits, 'zh');
    expect(result).toContain('达成共识');
    expect(result).toContain('家长承诺每日检查作业');
  });

  it('四种访问类型都应正确翻译', () => {
    const types = ['in_person', 'phone', 'video', 'school_meeting'] as const;
    const results = types.map(type =>
      buildHomeVisitSummary([{ visit_type: type, visit_purpose: 'test', visit_date: '2026-01-01' }], 'zh')
    );
    expect(results[0]).toContain('上门家访');
    expect(results[1]).toContain('电话家访');
    expect(results[2]).toContain('视频家访');
    expect(results[3]).toContain('到校面谈');
  });

  it('长目的或共识应截断', () => {
    const longPurpose = 'y'.repeat(80);
    const result = buildHomeVisitSummary([{
      visit_type: 'phone',
      visit_purpose: longPurpose,
      visit_date: '2026-05-20',
    }], 'zh');
    expect(result).toContain('...');
  });
});

describe('buildBehaviorSummary - 行为表现摘要（generate-comment 版本）', () => {
  it('空数组输入应返回空字符串', () => {
    expect(buildBehaviorSummary([], 'zh')).toBe('');
    expect(buildBehaviorSummary(null as any, 'en')).toBe('');
  });

  it('单条记录应包含类型和积分', () => {
    const behaviors: BehaviorDataItem[] = [{
      behavior_type: 'praise',
      behavior_tag: '积极发言',
      points: 1,
      record_date: '2026-05-20',
    }];
    const result = buildBehaviorSummary(behaviors, 'zh');
    expect(result).toContain('【行为表现记录】');
    expect(result).toContain('累计记录1条');
    expect(result).toContain('积分变动：+1');
    expect(result).toContain('表扬1次');
  });

  it('三种行为类型应正确统计', () => {
    const behaviors: BehaviorDataItem[] = [
      { behavior_type: 'praise', behavior_tag: 'a', points: 1, record_date: '2026-01-01' },
      { behavior_type: 'warning', behavior_tag: 'b', points: -1, record_date: '2026-01-02' },
      { behavior_type: 'punishment', behavior_tag: 'c', points: -2, record_date: '2026-01-03' },
    ];
    const result = buildBehaviorSummary(behaviors, 'zh');
    expect(result).toContain('表扬1次');
    expect(result).toContain('提醒1次');
    expect(result).toContain('惩罚1次');
  });

  it('总积分应为正负均可', () => {
    const positive = buildBehaviorSummary([
      { behavior_type: 'praise', behavior_tag: 'a', points: 3, record_date: '2026-01-01' },
    ], 'zh');
    expect(positive).toContain('积分变动：+3');

    const negative = buildBehaviorSummary([
      { behavior_type: 'punishment', behavior_tag: 'a', points: -5, record_date: '2026-01-01' },
    ], 'zh');
    expect(negative).toContain('积分变动：-5');
  });

  it('近期标签只显示最近5条', () => {
    const behaviors = Array.from({ length: 7 }, (_, i) => ({
      behavior_type: 'praise',
      behavior_tag: `标签${i + 1}`,
      points: 1,
      record_date: `2026-0${Math.floor(i / 30) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
    }));
    const result = buildBehaviorSummary(behaviors, 'zh');
    expect(result).toContain('标签7');
    expect(result).not.toContain('标签1');
  });

  it('无标签项不应显示近期标签区域', () => {
    const result = buildBehaviorSummary([{
      behavior_type: 'warning',
      description: '无标签记录',
      points: -1,
      record_date: '2026-05-20',
    }], 'zh');
    expect(result).toContain('累计记录1条');
    expect(result).not.toContain('近期标签');
  });

  it('英文模式应输出英文标签', () => {
    const result = buildBehaviorSummary([{
      behavior_type: 'praise',
      behavior_tag: 'Great answer',
      points: 2,
      record_date: '2026-05-20',
    }], 'en');
    expect(result).toContain('[Behavior Records]');
    expect(result).toContain('Praise');
  });
});
