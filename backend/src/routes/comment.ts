import { Hono } from 'hono';
import { z } from 'zod';
import { Env } from '../types';

const comment = new Hono<{ Bindings: Env }>();

const i18n = {
  systemPrompt: {
    zh: '你是一位拥有15年教学经验的资深教师，擅长撰写温暖而有洞察力的学生评语。你的评语风格：具体而不空泛、真诚而不敷衍、鼓励中带有建设性建议。每条评语应体现对学生的个性化关注，避免模板化语言。字数控制在100-300字之间。',
    en: "You are an experienced teacher with 15 years of expertise in writing warm and insightful student comments. Your style: specific not generic, sincere not perfunctory, encouraging with constructive suggestions. Each comment should show personalized attention to the student. Keep it between 100-300 words.",
  },
  traitMap: {
    zh: {
      attitude: '学习态度端正，课堂上认真听讲',
      performance: '课堂表现积极，能主动参与讨论和回答问题',
      homework: '作业完成认真，书写工整规范',
      relationship: '与同学相处融洽，乐于帮助他人',
      creativity: '思维活跃，有独特的创新见解',
      responsibility: '责任心强，能认真完成各项任务',
    },
    en: {
      attitude: 'Has a positive learning attitude and listens attentively in class',
      performance: 'Active in class, participates in discussions and answers questions',
      homework: 'Completes homework carefully with neat and standard handwriting',
      relationship: 'Gets along well with classmates and is willing to help others',
      creativity: 'Thinks actively and has unique creative insights',
      responsibility: 'Strong sense of responsibility, completes tasks seriously',
    },
  },
  typeMap: {
    zh: {
      summary: '期末总结：对本学期整体表现的全面回顾',
      encouragement: '日常鼓励：发现闪光点并给予正向激励',
      improvement: '改进建议：指出需要提升的方面并提出建议',
      parent: '家长沟通：适合向家长汇报学生情况的口吻',
    },
    en: {
      summary: 'End-of-term summary: comprehensive review of overall performance this semester',
      encouragement: 'Daily encouragement: highlight strengths and provide positive motivation',
      improvement: 'Improvement suggestions: identify areas for growth with actionable advice',
      parent: 'Parent communication: tone suitable for reporting to parents',
    },
  },
  toneMap: {
    zh: {
      formal: '正式亲切：专业但不失温度的书面语风格',
      warm: '温暖鼓励：充满关爱和正能量的语气',
      objective: '客观中立：公正描述事实，不带主观色彩',
    },
    en: {
      formal: 'Formal yet warm: professional written style with warmth',
      warm: 'Warmly encouraging: full of care and positive energy',
      objective: 'Objective and neutral: fair description without subjective bias',
    },
  },
};

const generateSchema = z.object({
  student_name: z.string().min(1).max(20),
  traits: z.array(z.string()).max(6).default([]),
  comment_type: z.enum(['summary', 'encouragement', 'improvement', 'parent']).default('summary'),
  tone_style: z.enum(['formal', 'warm', 'objective']).default('formal'),
  lang: z.enum(['zh', 'en']).default('zh'),
});

comment.post('/api/generate-comment', async (c) => {
  try {
    const rawBody = await c.req.json();
    const parsed = generateSchema.safeParse(rawBody);
    if (!parsed.success) {
      return c.json({ error: '参数错误', details: parsed.error.flatten().fieldErrors }, 400);
    }
    const data = parsed.data;
    const lang = data.lang;
    const traitLabels = (data.traits || []).map((t) => i18n.traitMap[lang][t] || t).join('；');
    const typeDesc = i18n.typeMap[lang][data.comment_type] || '';
    const toneDesc = i18n.toneMap[lang][data.tone_style] || '';

    const prompt = `请为以下学生撰写一条${typeDesc}风格的评语。

【学生姓名】${data.student_name}
${traitLabels ? `【学生特点】${traitLabels}` : ''}
【语气要求】${toneDesc}

要求：
1. 字数控制在100-300字
2. 具体而不空泛，避免"学习刻苦""团结同学"等套话
3. 至少提到2个具体的行为或场景
4. 结尾给予温暖或具体的期望
5. 直接输出评语正文，不要加标题或前缀`;

    const qwenApiKey = c.env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return c.json({ error: 'AI服务未配置', code: 'AI_NOT_CONFIGURED' }, 503);
    }

    const response = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qwenApiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: {
            messages: [
              { role: 'system', content: i18n.systemPrompt[lang] },
              { role: 'user', content: prompt },
            ],
          },
          parameters: {
            result_format: 'text',
            temperature: 0.85,
            top_p: 0.9,
            seed: Math.floor(Math.random() * 2147483647),
            max_tokens: 800,
          },
        }),
      },
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Qwen API error:', errData);
      return c.json({ error: 'AI生成失败，请稍后重试', code: 'AI_FAILED' }, 502);
    }

    const result = await response.json() as any;
    const commentText = result?.output?.text || '';

    if (!commentText) {
      return c.json({ error: 'AI返回内容为空', code: 'AI_EMPTY_RESPONSE' }, 500);
    }

    return c.json(
      { comment: commentText.trim(), model: 'qwen-turbo' },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } },
    );
  } catch (error) {
    console.error('Generate comment error:', error);
    return c.json({ error: '服务器内部错误', code: 'INTERNAL_ERROR' }, 500);
  }
});

export default comment;
