export interface PromptVariables {
  student_name: string;
  traits: string[];
  tone: string;
  length: { min: number; max: number };
  comment_type: string;
  lang?: 'zh' | 'en';
}

const traitDescriptions: Record<string, Record<string, string>> = {
  zh: {
    attitude: '学习态度端正，课堂上认真听讲',
    performance: '课堂表现积极，能主动参与讨论和回答问题',
    homework: '作业完成认真，书写工整规范',
    relationship: '与同学相处融洽，乐于帮助他人',
    creativity: '思维活跃，有独特的创新见解',
    responsibility: '责任心强，能认真完成各项任务',
    respectful: '尊敬师长，文明礼貌',
    responsible: '有责任心，能承担班级事务',
    cooperative: '团结同学，乐于助人',
    polite: '言行举止得体，讲文明懂礼貌',
  },
  en: {
    attitude: 'Has a positive learning attitude and listens attentively',
    performance: 'Active in class, participates in discussions and answers questions',
    homework: 'Completes homework carefully with neat and standard handwriting',
    relationship: 'Gets along well with classmates and is willing to help others',
    creativity: 'Thinks actively and has unique creative insights',
    responsibility: 'Strong sense of responsibility, completes tasks seriously',
    respectful: 'Respects teachers and is polite',
    responsible: 'Responsible and capable of handling class duties',
    cooperative: 'Cooperative with classmates and helpful to others',
    polite: 'Well-mannered and courteous in behavior',
  },
};

const toneDescriptions: Record<string, Record<string, string>> = {
  zh: {
    gentle: '温和鼓励型：以鼓励为主，语言温暖亲切，多用正面词汇',
    strict: '严谨客观型：客观描述事实，指出不足时态度严肃但建设性',
    humorous: '幽默亲切型：轻松活泼的语调，适当运用幽默元素拉近距离',
    formal: '正式亲切：专业但不失温度的书面语风格',
    warm: '温暖鼓励：充满关爱和正能量的语气',
    objective: '客观中立：公正描述事实，不带主观色彩',
  },
  en: {
    gentle: 'Gentle encouragement style: warm language with positive vocabulary',
    strict: 'Strict objective style: factual description with constructive criticism',
    humorous: 'Humorous friendly style: lively tone with appropriate humor',
    formal: 'Formal yet warm: professional but not cold written style',
    warm: 'Warmly encouraging: full of care and positive energy',
    objective: 'Objective and neutral: fair description without subjectivity',
  },
};

const typeDescriptions: Record<string, Record<string, string>> = {
  zh: {
    summary: '期末总结：对本学期整体表现的全面回顾',
    encouragement: '日常鼓励：发现闪光点并给予正向激励',
    improvement: '改进建议：指出需要提升的方面并提出建议',
    parent: '家长沟通：适合向家长汇报学生情况的口吻',
  },
  en: {
    summary: 'End-of-term summary: comprehensive review of the semester',
    encouragement: 'Daily encouragement: highlight strengths with positive motivation',
    improvement: 'Improvement suggestions: point out areas for improvement constructively',
    parent: 'Parent communication: tone suitable for reporting to parents',
  },
};

function getTraitDescription(trait: string, lang: 'zh' | 'en' = 'zh'): string {
  return traitDescriptions[lang]?.[trait] || trait;
}

function buildTraitsText(traits: string[], lang: 'zh' | 'en' = 'zh'): string {
  if (!traits || traits.length === 0) return '';
  return traits.map((t) => getTraitDescription(t, lang)).join('；');
}

function buildLengthText(length: { min: number; max: number }, lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'zh') {
    return `${length.min}-${length.max}字`;
  }
  return `${length.min}-${length.max} words`;
}

export function renderPromptTemplate(template: string, variables: PromptVariables): string {
  const lang = variables.lang || 'zh';

  let rendered = template;

  rendered = rendered.replace(/\{\{student_name\}\}/g, variables.student_name);
  rendered = rendered.replace(/\{\{traits\}\}/g, buildTraitsText(variables.traits, lang));
  rendered = rendered.replace(
    /\{\{tone\}\}/g,
    toneDescriptions[lang]?.[variables.tone] || variables.tone,
  );
  rendered = rendered.replace(/\{\{length\}\}/g, buildLengthText(variables.length, lang));
  rendered = rendered.replace(
    /\{\{comment_type\}\}/g,
    typeDescriptions[lang]?.[variables.comment_type] || variables.comment_type,
  );

  return rendered;
}

export function getDefaultSystemPrompt(lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'zh') {
    return `你是一位拥有15年教学经验的资深教师，擅长撰写温暖而有洞察力的学生评语。你的评语风格：具体而不空泛、真诚而不敷衍、鼓励中带有建设性建议。每条评语应体现对学生的个性化关注，避免模板化语言。直接输出评语正文，不要加标题或前缀。`;
  }
  return `You are an experienced teacher with 15 years of expertise in writing warm and insightful student comments. Your style: specific not generic, sincere not perfunctory, encouraging with constructive suggestions. Each comment should show personalized attention. Output only the comment body, no title or prefix.`;
}

export function getDefaultUserPrompt(variables: PromptVariables): string {
  const lang = variables.lang || 'zh';
  const typeDesc = typeDescriptions[lang]?.[variables.comment_type] || variables.comment_type;
  const toneDesc = toneDescriptions[lang]?.[variables.tone] || variables.tone;
  const traitsText = buildTraitsText(variables.traits, lang);
  const lengthText = buildLengthText(variables.length, lang);

  if (lang === 'zh') {
    return `请为以下学生撰写一条${typeDesc}风格的评语。

【学生姓名】${variables.student_name}
${traitsText ? `【学生特点】${traitsText}` : ''}
【语气要求】${toneDesc}
【字数要求】${lengthText}

要求：
1. 字数控制在${variables.length.min}-${variables.length.max}字之间
2. 具体而不空泛，避免套话
3. 至少提到2个具体的行为或场景
4. 结尾给予温暖或具体的期望
5. 直接输出评语正文`;
  }

  return `Please write a ${typeDesc} style comment for the following student.

[Student Name] ${variables.student_name}
${traitsText ? `[Student Traits] ${traitsText}` : ''}
[Tone Requirement] ${toneDesc}
[Word Count] ${lengthText}

Requirements:
1. Keep it between ${variables.length.min}-${variables.length.max} words
2. Specific, not generic cliches
3. Mention at least 2 specific behaviors/scenarios
4. End with warmth or concrete expectations
5. Output only the comment text`;
}

export function getBuiltInTemplate(templateId: string): string | null {
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
