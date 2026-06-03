import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  QWEN_API_KEY: string;
}

interface GenerateRequest {
  student_name: string;
  traits?: string[];
  class_role?: string;
  exam_data?: ExamDataItem[];
  conversation_data?: ConversationDataItem[];
  home_visit_data?: HomeVisitDataItem[];
  behavior_data?: BehaviorDataItem[];
  comment_type?: "summary" | "encouragement" | "improvement" | "parent";
  tone_style?: "gentle" | "strict" | "humorous" | "formal" | "warm" | "objective";
  length_option?: "concise" | "standard" | "detailed";
  lang?: "zh" | "en";
  template_id?: string;
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

interface ConversationDataItem {
  conversation_type: string;
  category?: string;
  content: string;
  student_reaction?: string;
  follow_up?: string;
  conversation_date: string;
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

interface BehaviorDataItem {
  behavior_type: string;
  behavior_category: string;
  behavior_tag?: string;
  description?: string;
  points?: number;
  record_date: string;
}

const traitDescriptions = {
  zh: {
    attitude: "学习态度端正，课堂上认真听讲",
    performance: "课堂表现积极，能主动参与讨论和回答问题",
    homework: "作业完成认真，书写工整规范",
    relationship: "与同学相处融洽，乐于帮助他人",
    creativity: "思维活跃，有独特的创新见解",
    responsibility: "责任心强，能认真完成各项任务",
    respectful: "尊敬师长，文明礼貌",
    responsible: "有责任心，能承担班级事务",
    cooperative: "团结同学，乐于助人",
    polite: "言行举止得体，讲文明懂礼貌",
  },
  en: {
    attitude: "Has a positive learning attitude and listens attentively",
    performance: "Active in class, participates in discussions and answers questions",
    homework: "Completes homework carefully with neat and standard handwriting",
    relationship: "Gets along well with classmates and is willing to help others",
    creativity: "Thinks actively and has unique creative insights",
    responsibility: "Strong sense of responsibility, completes tasks seriously",
    respectful: "Respects teachers and is polite",
    responsible: "Responsible and capable of handling class duties",
    cooperative: "Cooperative with classmates and helpful to others",
    polite: "Well-mannered and courteous in behavior",
  },
};

const roleDescriptions: Record<string, { zh: string; en: string }> = {
  class_monitor: {
    zh: '该生担任班长职务。评语应体现其领导力、统筹协调能力、公正担当的品质，以及以身作则的模范作用。可提及组织活动、协调同学矛盾、带动班级氛围、成为老师得力助手等具体表现。',
    en: 'This student serves as Class Monitor. The comment should reflect their leadership, coordination abilities, sense of fairness, and role as a model for others. Mention organizing activities, mediating conflicts, boosting class morale, and being the teacher\'s right hand.',
  },
  study_commissar: {
    zh: '该生担任学习委员。评语应突出其学业榜样作用、乐于分享的精神、在学风建设中的贡献。可提及自身成绩优异且不吝分享、主动整理知识点、解答同学疑问、带动勤学好问的氛围等。',
    en: 'This student serves as Study Commissar. Highlight their role as an academic model, willingness to share, and contribution to study atmosphere. Mention excellent grades, sharing notes, helping classmates, and fostering a love of learning.',
  },
  discipline_commissar: {
    zh: '该生担任纪律委员。评语应肯定其原则性、责任感及自我约束能力。可提及自身严于律己、对待纪律公正严明、温和而坚定地提醒同学遵守规则、为大家营造专注高效的学习环境等。',
    en: 'This student serves as Discipline Commissar. Emphasize their principles, self-discipline, and fairness. Mention leading by example, enforcing rules fairly yet kindly, and maintaining a focused learning environment.',
  },
  hygiene_commissar: {
    zh: '该生担任卫生委员。评语应强调其细致入微、亲力亲为的品质和对班级环境的责任心。可提及日常清扫细致入微、坚持培养大家的卫生习惯、让整洁舒适的环境成为班级福利等。',
    en: 'This student serves as Hygiene Commissar. Highlight their attention to detail, hands-on approach, and dedication to classroom cleanliness. Mention thorough cleaning routines, cultivating hygiene habits, and maintaining a pleasant environment.',
  },
  subject_rep: {
    zh: '该生担任课代表（科代表）。评语应聚焦其作为学科桥梁的作用：按时收发作业、及时反馈同学疑问、落实老师教学安排、用热情点燃大家对学科的兴趣、分享实用学习方法等。',
    en: 'This student serves as Subject Representative. Focus on their role as the bridge between teacher and students: collecting/distributing assignments, relaying questions, implementing teaching plans, sparking interest in the subject, and sharing study methods.',
  },
  arts_commissar: {
    zh: '该生担任文艺委员。评语应关注其在丰富班级生活、提升审美情趣方面的贡献。可提及组织文艺活动的创造力、为班级文化增添色彩、带动同学们参与文化活动等。',
    en: 'This student serves as Arts Commissar. Highlight contributions to enriching class life and aesthetic appreciation. Mention creativity in organizing cultural activities, adding color to class culture, and encouraging participation.',
  },
  sports_commissar: {
    zh: '该生担任体育委员。评语应体现其运动引领作用和组织体育活动的能力。可提及带头参与体育锻炼、组织体育比赛或课间活动、激发同学们的运动热情等。',
    en: 'This student serves as Sports Commissar. Reflect their leadership in physical activities and ability to organize sports. Mention leading exercise sessions, organizing competitions, and inspiring enthusiasm for athletics.',
  },
  labor_commissar: {
    zh: '该生担任劳动委员。评语应突出其吃苦耐劳、服务奉献的精神。可提及认真安排每次值日、身先士卒参与劳动、培养同学们的劳动习惯等。',
    en: 'This student serves as Labor Commissar. Emphasize their hardworking, service-oriented spirit. Mention organizing duty schedules, leading by example in labor tasks, and cultivating good work habits in classmates.',
  },
  group_leader: {
    zh: '该生担任小组长。评语应关注其团队协作能力和小组管理责任感。可提及协调组员关系、组织小组讨论和活动、关心帮助组内同学、在团队合作中发挥积极作用等。',
    en: 'This student serves as Group Leader. Focus on teamwork skills and management responsibility. Mention coordinating team members, organizing discussions, helping teammates, and playing an active role in collaboration.',
  },
};

const toneDescriptions = {
  zh: {
    gentle: "温和鼓励型：以鼓励为主，语言温暖亲切，多用正面词汇",
    strict: "严谨客观型：客观描述事实，指出不足时态度严肃但建设性",
    humorous: "幽默亲切型：轻松活泼的语调，适当运用幽默元素拉近距离",
    formal: "正式亲切：专业但不失温度的书面语风格",
    warm: "温暖鼓励：充满关爱和正能量的语气",
    objective: "客观中立：公正描述事实，不带主观色彩",
  },
  en: {
    gentle: "Gentle encouragement style: warm language with positive vocabulary",
    strict: "Strict objective style: factual description with constructive criticism",
    humorous: "Humorous friendly style: lively tone with appropriate humor",
    formal: "Formal yet warm: professional but not cold written style",
    warm: "Warmly encouraging: full of care and positive energy",
    objective: "Objective and neutral: fair description without subjectivity",
  },
};

const typeDescriptions = {
  zh: {
    summary: "期末总结：对本学期整体表现的全面回顾",
    encouragement: "日常鼓励：发现闪光点并给予正向激励",
    improvement: "改进建议：指出需要提升的方面并提出建议",
    parent: "家长沟通：适合向家长汇报学生情况的口吻",
  },
  en: {
    summary: "End-of-term summary: comprehensive review of the semester",
    encouragement: "Daily encouragement: highlight strengths with positive motivation",
    improvement: "Improvement suggestions: point out areas for improvement constructively",
    parent: "Parent communication: tone suitable for reporting to parents",
  },
};

const lengthRanges = {
  concise: { min: 80, max: 120 },
  standard: { min: 200, max: 300 },
  detailed: { min: 400, max: 500 },
};

function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return rendered;
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
        const arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
        scoreChanges.push(`${sorted[i].subject} ${sorted[i-1].score}→${sorted[i].score}(${arrow}${diff >= 0 ? '+' : ''}${diff})`);
      }
    }
  }

  if (lang === 'zh') {
    const lines: string[] = [`【学业成绩画像】`];
    lines.push(`- 最近${exams.length}次考试平均分：${avgScore.toFixed(1)}分`);
    lines.push(`- 最高分：${highest.subject} ${highest.score}/${fullScore(highest)}（${highest.exam_name}）`);
    lines.push(`- 最低分：${lowest.subject} ${lowest.score}/${fullScore(lowest)}（${lowest.exam_name}）`);
    if (bestRank) {
      lines.push(`- 最佳排名：第${bestRank.class_rank}名/${bestRank.total_count}人（前${((bestRank.class_rank / bestRank.total_count) * 100).toFixed(0)}%，${bestRank.exam_name}）`);
    }
    if (subjectMap.size > 1) {
      lines.push(`- 涉及科目：${[...subjectMap.keys()].join('、')}`);
    }
    if (scoreChanges.length > 0) {
      lines.push(`- 成绩变化趋势：${scoreChanges.join('，')}`);
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

function buildConversationSummary(conversations: ConversationDataItem[], lang: 'zh' | 'en'): string {
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

function buildHomeVisitSummary(visits: HomeVisitDataItem[], lang: 'zh' | 'en'): string {
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
        lines.push(`  → Consensus: ${v.consensus.slice(0, 50)}${v.consensus.length > 50 ? '...' : ''}`);
      }
    }
    return '\n' + lines.join('\n');
  }
}

/**
 * 从 D1 数据库查询用户近期为同一学生生成的评语
 */
async function getRecentComments(
  db: D1Database,
  userId: string,
  studentName: string,
  limit: number = 5,
): Promise<string[]> {
  try {
    const result = await db.prepare(
      `SELECT content FROM comments WHERE user_id = ? AND student_name = ? ORDER BY created_at DESC LIMIT ?`
    ).bind(userId, studentName, limit).all();
    return (result.results || []).map((r: any) => r.content as string).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * 计算两段文本的 Jaccard 相似度（基于字符 n-gram）
 * 返回 0-1 之间的值，1 表示完全相同
 */
function textSimilarity(textA: string, textB: string, n: number = 2): number {
  if (!textA || !textB) return 0;
  const normalize = (s: string) => s.replace(/[\s，。！？、；：""（）\s]/g, "").toLowerCase();
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
 * 返回 { maxSimilarity, similarComment } 如果相似度过高
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

function buildBehaviorSummary(behaviors: BehaviorDataItem[], lang: 'zh' | 'en'): string {
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
    const lines: string[] = `[Behavior Records]`;
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

function buildPrompt(data: GenerateRequest, recentComments: string[] = []): { systemPrompt: string; userPrompt: string } {
  const lang = data.lang || "zh";
  const traitMap = traitDescriptions[lang];
  const toneMap = toneDescriptions[lang];
  const typeMap = typeDescriptions[lang];

  const traitsText = (data.traits || [])
    .map((t) => traitMap[t] || t)
    .join("；");

  const roleDesc = data.class_role ? (roleDescriptions[data.class_role]?.[lang] || '') : '';
  const roleText = roleDesc ? `\n【班级职务】${roleDesc}` : '';

  const examText = buildExamSummary(data.exam_data || [], lang);
  const conversationText = buildConversationSummary(data.conversation_data || [], lang);
  const homeVisitText = buildHomeVisitSummary(data.home_visit_data || [], lang);
  const behaviorText = buildBehaviorSummary(data.behavior_data || [], lang);

  const toneDesc = toneMap[data.tone_style || "formal"] || data.tone_style;
  const typeDesc = typeMap[data.comment_type || "summary"] || data.comment_type;
  const lengthRange = lengthRanges[data.length_option || "standard"];
  const lengthText = lang === "zh"
    ? `${lengthRange.min}-${lengthRange.max}字`
    : `${lengthRange.min}-${lengthRange.max} words`;

  const systemPrompt = lang === "zh"
    ? `你是一位拥有15年教学经验的资深教师，擅长撰写温暖而有洞察力的学生评语。你的评语风格：具体而不空泛、真诚而不敷衍、鼓励中带有建设性建议。每条评语应体现对学生的个性化关注，避免模板化语言。直接输出评语正文，不要加标题或前缀。`
    : `You are an experienced teacher with 15 years of expertise in writing warm and insightful student comments. Your style: specific not generic, sincere not perfunctory, encouraging with constructive suggestions. Each comment should show personalized attention. Output only the comment body, no title or prefix.`;

  if (data.template_id) {
    const template = getBuiltInTemplate(data.template_id);
    if (template) {
      const variables = {
        student_name: data.student_name,
        traits: traitsText,
        tone: toneDesc,
        length: lengthText,
        comment_type: typeDesc,
      };
      const userPrompt = renderTemplate(template, variables);
      return { systemPrompt, userPrompt };
    }
  }

  if (lang === "zh") {
    const dedupHint = recentComments.length > 0
      ? `\n\n【重要：避免重复】以下是你之前为该学生写过的评语，请务必写出完全不同的内容和角度，不要重复相似的表达：\n${recentComments.map((c, i) => `（历史评语${i + 1}）${c.slice(0, 150)}${c.length > 150 ? "..." : ""}`).join("\n")}`
      : "";

    const userPrompt = `请为以下学生撰写一条${typeDesc}风格的评语。

【学生姓名】${data.student_name}
${traitsText ? `【学生特点】${traitsText}` : ""}${roleText}${examText}${conversationText}${homeVisitText}${behaviorText}
【语气要求】${toneDesc}
【字数要求】${lengthText}

要求：
1. 字数控制在${lengthRange.min}-${lengthRange.max}字之间
2. 具体而不空泛，避免套话
3. 至少提到2个具体的行为或场景
4. 结尾给予温暖或具体的期望
5. 直接输出评语正文${dedupHint}`;

    return { systemPrompt, userPrompt };
  }

  const dedupHintEn = recentComments.length > 0
    ? `\n\n[IMPORTANT: Avoid Repetition] Below are previous comments you wrote for this student. You MUST write something completely different in content and perspective, do not repeat similar expressions:\n${recentComments.map((c, i) => `(Previous Comment ${i + 1}) ${c.slice(0, 150)}${c.length > 150 ? '...' : ''}`).join('\n')}`
    : '';

  const userPrompt = `Please write a ${typeDesc} style comment for the following student.\n\n[Student Name] ${data.student_name}\n${traitsText ? `[Student Traits] ${traitsText}` : ''}${roleText ? `\n[Class Role] ${roleDesc}` : ''}${examText ? `\n${examText}` : ''}${conversationText ? `\n${conversationText}` : ''}${homeVisitText ? `\n${homeVisitText}` : ''}${behaviorText ? `\n${behaviorText}` : ''}\n[Tone Requirement] ${toneDesc}\n[Word Count] ${lengthText}\n\nRequirements:\n1. Keep it between ${lengthRange.min}-${lengthRange.max} words\n2. Specific, not generic cliches\n3. Mention at least 2 specific behaviors/scenarios\n4. End with warmth or concrete expectations\n5. Output only the comment text${dedupHintEn}`;

  return { systemPrompt, userPrompt };
}

function getBuiltInTemplate(templateId: string): string | null {
  const templates: Record<string, string> = {
    tpl_summary:
      '请为{{student_name}}撰写一条{{comment_type}}风格的评语。学生特点：{{traits}}。语气要求：{{tone}}。字数：{{length}}。',
    tpl_encouragement:
      '请为{{student_name}}撰写一条鼓励性质的评语。重点突出优点和进步。语气要求：{{tone}}。字数：{{length}}。',
    tpl_improvement:
      '请为{{student_name}}撰写一条改进建议评语。需要改进的方面：{{traits}}。语气要求：{{tone}}。字数：{{length}}。',
    tpl_parent:
      '请为{{student_name}}撰写一条适合向家长汇报的评语。语气要亲切专业，便于家长理解。字数：{{length}}。',
  };

  return templates[templateId] || null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const data: GenerateRequest = await request.json();

    if (!data.student_name || typeof data.student_name !== "string") {
      const lang = data.lang === "en" ? "en" : "zh";
      return Response.json(
        { error: lang === "zh" ? "请输入学生姓名" : "Student name is required" },
        { status: 400 }
      );
    }

    data.student_name = data.student_name.trim().slice(0, 20);
    data.traits = Array.isArray(data.traits) ? data.traits : [];
    data.comment_type = ["summary", "encouragement", "improvement", "parent"].includes(data.comment_type)
      ? data.comment_type
      : "summary";
    data.tone_style = ["gentle", "strict", "humorous", "formal", "warm", "objective"].includes(data.tone_style)
      ? data.tone_style
      : "formal";
    data.lang = data.lang === "en" ? "en" : "zh";

    // 查询用户为该学生写过的历史评语（用于去重）
    let recentComments: string[] = [];
    let userId = 'anonymous';
    const authHeader = request.headers.get('Authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          userId = payload.sub || payload.user_id || payload.id || 'anonymous';
        }
      } catch { /* ignore */ }
    }
    if (env.DB && userId !== 'anonymous') {
      recentComments = await getRecentComments(env.DB, userId, data.student_name, 5);
    }

    const { systemPrompt, userPrompt } = buildPrompt(data, recentComments);

    const qwenApiKey = env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return Response.json(
        { error: data.lang === "zh" ? "AI服务未配置" : "AI service not configured", code: "AI_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const aiResponse = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${qwenApiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-turbo",
          input: {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          },
          parameters: {
            result_format: "text",
            temperature: 0.85,
            top_p: 0.9,
            seed: Math.floor(Math.random() * 2147483647),
            max_tokens: 800,
          },
        }),
      },
    );

    if (!aiResponse.ok) {
      console.error("Qwen API error:", await aiResponse.text());
      return Response.json(
        { error: data.lang === "zh" ? "AI生成失败，请稍后重试" : "AI generation failed, please try again", code: "AI_FAILED" },
        { status: 502 }
      );
    }

    const result = await aiResponse.json() as any;
    let commentText = result?.output?.text?.trim() || "";

    if (!commentText) {
      return Response.json(
        { error: data.lang === "zh" ? "AI返回内容为空" : "AI returned empty content", code: "AI_EMPTY_RESPONSE" },
        { status: 500 }
      );
    }

    // 去重检测：与历史评语比对
    let dedupResult = checkDuplicate(commentText, recentComments, 0.6);
    let retryCount = 0;

    if (dedupResult.isDuplicate) {
      retryCount++;
      const strongerHint = data.lang === "zh"
        ? `\n[绝对避免重复] 刚才生成的评语与历史评语相似度${Math.round(dedupResult.maxSimilarity * 100)}%，请从完全不同的角度重新撰写。`
        : `\n[ABSOLUTELY AVOID REPETITION] Previous comment had ${Math.round(dedupResult.maxSimilarity * 100)}% similarity. Write from a completely different angle.`;
      const retryRes = await fetch("https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${qwenApiKey}` },
        body: JSON.stringify({ model: "qwen-turbo", input: { messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt + strongerHint }] }, parameters: { result_format: "text", temperature: 0.95, top_p: 0.95, seed: Math.floor(Math.random() * 2147483647), max_tokens: 800 } }),
      });
      if (retryRes.ok) {
        const retryData = (await retryRes.json()) as any;
        const retryText = retryData?.output?.text?.trim() || "";
        if (retryText) {
          const retryDedup = checkDuplicate(retryText, recentComments, 0.6);
          if (retryDedup.maxSimilarity < dedupResult.maxSimilarity) {
            commentText = retryText;
            dedupResult = retryDedup;
          }
        }
      }
    }

    let savedComment: any = null;
    if (env.DB && userId !== 'anonymous') {
      try {
        const insertResult = await env.DB.prepare(`
          INSERT INTO comments (user_id, student_name, content, traits, class_role, comment_type, tone_style, comment_length, model_used)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          userId,
          data.student_name,
          commentText,
          JSON.stringify(data.traits || []),
          data.class_role || null,
          data.comment_type || 'summary',
          data.tone_style || 'formal',
          data.length_option || 'standard',
          'qwen-turbo'
        ).run();

        if (insertResult.meta?.last_row_id) {
          savedComment = await env.DB.prepare(
            `SELECT * FROM comments WHERE rowid = ?`
          ).bind(insertResult.meta.last_row_id).first();
        }
      } catch (saveError) {
        console.error('Save comment error (non-fatal):', saveError);
      }
    }

    return Response.json(
      {
        id: savedComment?.id,
        comment: commentText,
        model: "qwen-turbo",
        dedup: { similarity: dedupResult.maxSimilarity, is_duplicate: dedupResult.isDuplicate, retry_count: retryCount },
        parameters: { student_name: data.student_name, traits: data.traits, class_role: data.class_role, comment_type: data.comment_type, tone_style: data.tone_style, length_option: data.length_option },
        created_at: savedComment?.created_at,
        saved: !!savedComment,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (error) {
    console.error("Generate comment error:", error);
    return Response.json(
      { error: "服务器内部错误", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
};
