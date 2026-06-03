import type { RagQueryRequest } from '../types';

function buildTeacherPrompt(
  context: Record<string, unknown>,
  chunks: Array<{ title?: string; content: string }>,
  recentComments: string[] = [],
): string {
  const studentInfo = context.studentInfo as { name?: string; traits?: string[]; commentType?: string; toneStyle?: string } | undefined;
  const name = studentInfo?.name || '该生';
  const traits = studentInfo?.traits || [];
  const commentTypeMap: Record<string, string> = { summary: '期末总结', encouragement: '日常鼓励', improvement: '改进建议', parent: '家长沟通' };
  const typeDesc = commentTypeMap[studentInfo?.commentType || 'summary'] || '期末总结';
  const toneMap: Record<string, string> = {
    gentle: '温和鼓励型',
    strict: '严谨客观型',
    humorous: '幽默亲切型',
    formal: '正式亲切',
    warm: '温暖鼓励',
    objective: '客观中立',
  };
  const toneDesc = toneMap[studentInfo?.toneStyle || 'gentle'] || '温和鼓励型';
  const lengthMap: Record<string, string> = { concise: '80-120字', standard: '200-300字', detailed: '400-500字' };
  const lengthDesc = lengthMap[(studentInfo as any)?.commentLength || 'standard'] || '200-300字';
  const traitLabels = traits.join('、');
  let kbContext = '';
  if (chunks.length > 0) {
    kbContext = '\n\n【参考优秀评语范例】\n';
    for (let ci = 0; ci < chunks.length; ci++) {
      const c = chunks[ci];
      kbContext += '【' + (c.title || '参考') + '】\n' + c.content;
      if (ci < chunks.length - 1) kbContext += '\n\n';
    }
    kbContext += '\n\n请参考以上范例的风格和写法，但不要直接复制。';
  }

  let prompt = '你是一位拥有15年教学经验的资深教师，擅长撰写温暖而有洞察力的学生评语。\n\n';
  prompt += '【任务】为以下学生撰写一条' + typeDesc + '风格的评语\n';
  prompt += '【学生姓名】' + name + '\n';
  if (traitLabels) prompt += '【学生特点】' + traitLabels + '\n';
  prompt += '【语气要求】' + toneDesc + '\n';
  prompt += '【字数要求】' + lengthDesc + '\n';
  if ((studentInfo as any)?.supplement) prompt += '【补充说明】' + (studentInfo as any).supplement + '\n';
  prompt += '\n【写作原则】\n';
  prompt += '1. 具体而不空泛——描述具体行为而非套话\n';
  prompt += '2. 至少提到2个具体的场景或行为细节\n';
  prompt += '3. 结尾给予温暖的期望或建议\n';
  prompt += '4. 字数控制在' + lengthDesc + '\n';
  prompt += '5. 直接输出评语正文，不加标题或前缀';
  prompt += kbContext;

  // 注入历史评语去重提示
  if (recentComments.length > 0) {
    prompt += '\n\n\u3010重要：避免重复\u3011以下是你之前为该学生写过的评语，请务必写出完全不同的内容和角度：\n';
    for (let ri = 0; ri < recentComments.length; ri++) {
      const rc = recentComments[ri];
      prompt += '（历史评语' + (ri + 1) + '）' + rc.slice(0, 150) + (rc.length > 150 ? '...' : '') + '\n';
    }
  }

  return prompt;
}

function buildSystemPrompt(): string {
  return '你是一位拥有15年教学经验的资深教师，擅长撰写温暖而有洞察力的学生评语。你的评语风格：具体而不空泛、真诚而不敷衍、鼓励中带有建设性建议。每条评语应体现对学生的个性化关注，避免模板化语言。直接输出评语正文，不要加标题或前缀。';
}

async function querySupabase(baseUrl: string, apiKey: string, table: string, select: string, filters: Record<string, string>, limit: number): Promise<Array<{ title?: string; content: string }>> {
  let urlStr = baseUrl + table;
  urlStr += '?select=' + encodeURIComponent(select);
  for (const fk in filters) urlStr += '&' + fk + '=' + encodeURIComponent(filters[fk]);
  urlStr += '&limit=' + String(limit);

  const res = await fetch(urlStr, {
    headers: { apikey: apiKey, Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{ title?: string; content: string }>;
  return data || [];
}

function buildSources(chunks: Array<{ title?: string; content: string; score?: number }>): Array<{ id: string; title?: string; score?: number }> {
  return chunks.map((chunk, index) => ({ id: String(index), title: chunk.title, score: chunk.score }));
}

/**
 * 去重：基于标题去重，保留 score 最高的
 */
function dedupChunks(chunks: Array<{ title?: string; content: string; score?: number }>): Array<{ title?: string; content: string; score?: number }> {
  const seen = new Map<string, { title?: string; content: string; score?: number }>();
  for (const chunk of chunks) {
    const key = chunk.title || chunk.content.slice(0, 50);
    const existing = seen.get(key);
    if (!existing || (chunk.score !== undefined && (existing.score === undefined || chunk.score > existing.score))) {
      seen.set(key, chunk);
    }
  }
  return Array.from(seen.values());
}

/**
 * 简单关键词相关性评分
 * 基于关键词命中数量和位置加权
 */
function scoreChunks(
  chunks: Array<{ title?: string; content: string }>,
  keywords: string[],
): Array<{ title?: string; content: string; score: number }> {
  return chunks.map((chunk) => {
    let score = 0;
    const text = (chunk.title || '') + ' ' + chunk.content;
    for (const kw of keywords) {
      // 标题命中权重更高
      if (chunk.title && chunk.title.includes(kw)) score += 3;
      // 内容命中
      const contentMatches = (chunk.content.match(new RegExp(kw, 'g')) || []).length;
      score += Math.min(contentMatches, 3); // 最多计3次
    }
    // 归一化到 0-1
    const maxScore = keywords.length * 6;
    const normalizedScore = maxScore > 0 ? score / maxScore : 0;
    return { ...chunk, score: Math.round(normalizedScore * 100) / 100 };
  }).sort((a, b) => b.score - a.score);
}

/**
 * 截断过长的 chunk 内容，避免 prompt 过长
 */
function truncateChunks(chunks: Array<{ title?: string; content: string; score?: number }>, maxChars: number = 800): Array<{ title?: string; content: string; score?: number }> {
  return chunks.map((chunk) => ({
    ...chunk,
    content: chunk.content.length > maxChars ? chunk.content.slice(0, maxChars) + '...' : chunk.content,
  }));
}

async function getRecentComments(db: D1Database, userId: string, studentName: string, limit: number = 5): Promise<string[]> {
  try {
    const result = await db.prepare(
      'SELECT content FROM comments WHERE user_id = ? AND student_name = ? ORDER BY created_at DESC LIMIT ?'
    ).bind(userId, studentName, limit).all();
    return (result.results || []).map((r: any) => r.content as string).filter(Boolean);
  } catch (e) { return []; }
}

function textSimilarity(textA: string, textB: string, n: number = 2): number {
  if (!textA || !textB) return 0;
  const normalize = (s: string) => s.replace(/[\s\uff0c\u3002\uff01\uff1f\u3001\uff1b\uff1a\u201c\u201d\u2018\u2019\uff08\uff09]/g, '').toLowerCase();
  const a = normalize(textA);
  const b = normalize(textB);
  if (a === b) return 1;
  const getNgrams = (s: string): Set<string> => {
    const grams = new Set<string>();
    for (let i = 0; i <= s.length - n; i++) grams.add(s.slice(i, i + n));
    return grams;
  };
  const setA = getNgrams(a);
  const setB = getNgrams(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const gram of setA) { if (setB.has(gram)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function checkDuplicate(
  newComment: string,
  historyComments: string[],
  threshold: number = 0.6,
): { isDuplicate: boolean; maxSimilarity: number; similarComment: string | null } {
  let maxSim = 0;
  let mostSimilar: string | null = null;
  for (const hist of historyComments) {
    const sim = textSimilarity(newComment, hist);
    if (sim > maxSim) { maxSim = sim; mostSimilar = hist; }
  }
  return { isDuplicate: maxSim >= threshold, maxSimilarity: Math.round(maxSim * 100) / 100, similarComment: mostSimilar };
}

function extractUserId(request: Request): string {
  const authHeader = request.headers.get('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        return payload.sub || payload.user_id || payload.id || 'anonymous';
      }
    } catch (e) { /* ignore */ }
  }
  return 'anonymous';
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  try {
    const body = (await request.json()) as Partial<RagQueryRequest>;
    if (!body.query || !body.productLine) return Response.json({ error: '缺少必要参数' }, { status: 400 });

    let sbUrl: string | undefined, sbKey: string | undefined;
    try { sbUrl = env.SUPABASE_URL; sbKey = env.SUPABASE_KEY; } catch (e) { /* env vars may not be defined */ }
    if (!sbUrl || !sbKey) return Response.json({ error: 'Supabase未配置', code: 'SUPABASE_NOT_CONFIGURED' }, { status: 503 });

    const studentInfo = (body.context?.studentInfo || {}) as { name?: string; traits?: string[]; commentType?: string };
    const commentType = studentInfo.commentType || 'summary';
    const typeKeywords: Record<string, string[]> = {
      summary: ['期末总结', '学期总结'], encouragement: ['日常鼓励', '表扬', '进步'],
      improvement: ['改进建议', '需要提升'], parent: ['家长沟通', '家校联系'],
    };

    const keywords = (typeKeywords[commentType] || []).concat(studentInfo.traits || []);
    const retrievedChunks: Array<{ title?: string; content: string }> = [];

    // 优先尝试向量语义检索（需要 Supabase pgvector + RPC 函数 match_documents）
    let vectorSearchDone = false;
    try {
      const queryText = keywords.join(' ');
      if (queryText.trim()) {
        const vectorRes = await fetch(`${sbUrl}rpc/match_documents`, {
          method: 'POST',
          headers: {
            apikey: sbKey,
            Authorization: 'Bearer ' + sbKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query_text: queryText,
            match_count: 5,
            filter_product: 'teachers',
          }),
        });
        if (vectorRes.ok) {
          const vectorData = (await vectorRes.json()) as Array<{ title?: string; content: string }>;
          if (vectorData && vectorData.length > 0) {
            retrievedChunks.push(...vectorData);
            vectorSearchDone = true;
          }
        }
      }
    } catch (vectorErr) {
      // 向量检索不可用，降级到关键词检索
      console.log('Vector search unavailable, falling back to keyword search');
    }

    // Fallback: 关键词检索（修复多 filter 逻辑）
    if (!vectorSearchDone) {
      if (keywords.length > 0) {
        // 构建正确的 or 查询：标题匹配任一关键词 AND 类型匹配教师相关
        const titleOrClause = keywords
          .slice(0, 3)
          .map((kw) => `title.ilike.*${kw}*`)
          .join(',');
        const results = await querySupabase(sbUrl, sbKey, 'kb_documents', 'title,content',
          { is_published: 'eq.true', or: `(${titleOrClause}),and(or(content_type.like.*teacher*,content_type.eq.evaluation_principle,content_type.eq.language_template))` }, 5);
        retrievedChunks.push(...results);

        if (retrievedChunks.length === 0) {
          // 二级 fallback：按类型获取通用教师评语知识
          const fallback = await querySupabase(sbUrl, sbKey, 'kb_documents', 'title,content',
            { is_published: 'eq.true', or: '(content_type.like.*teacher*,content_type.eq.evaluation_principle)' }, 3);
          retrievedChunks.push(...fallback);
        }
      } else {
        const defaultResults = await querySupabase(sbUrl, sbKey, 'kb_documents', 'title,content',
          { is_published: 'eq.true', or: '(content_type.like.*teacher*,content_type.eq.evaluation_principle,content_type.eq.language_template)' }, 3);
        retrievedChunks.push(...defaultResults);
      }
    }

    // 检索后处理：去重 → 评分 → 截断
    let processedChunks = dedupChunks(retrievedChunks);
    if (!vectorSearchDone && keywords.length > 0) {
      processedChunks = scoreChunks(processedChunks, keywords);
    }
    processedChunks = truncateChunks(processedChunks, 800);
    // 最多保留5个 chunk
    processedChunks = processedChunks.slice(0, 5);

    const retrievalMethod: 'vector' | 'keyword' | 'fallback' = vectorSearchDone ? 'vector' : (keywords.length > 0 ? 'keyword' : 'fallback');

    // 查询历史评语用于生成去重
    let recentComments: string[] = [];
    const userId = extractUserId(request);
    const studentName = studentInfo.name || '';
    if ((env as any).DB && userId !== 'anonymous' && studentName) {
      recentComments = await getRecentComments((env as any).DB, userId, studentName, 5);
    }

    const prompt = buildTeacherPrompt(body.context || {}, processedChunks, recentComments);
    const systemPrompt = buildSystemPrompt();
    let qwenApiKey: string | undefined;
    try { qwenApiKey = env.QWEN_API_KEY; } catch (e) { /* env var may not be defined */ }

    const finalSources = buildSources(processedChunks);

    if (!qwenApiKey) {
      const debugResp = { answer: '[RAG-Debug] Prompt ' + prompt.length + ' chars, ' + retrievedChunks.length + ' chunks', sources: finalSources, chunk_count: retrievedChunks.length };
      if (body.stream) {
        return new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(debugResp) + '\n\n'));
            controller.close();
          }
        }), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
      }
      return Response.json(debugResp);
    }

    const wantStream = body.stream === true;

    if (wantStream) {
      const aiResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + qwenApiKey, Accept: 'text/event-stream' },
        body: JSON.stringify({
          model: 'qwen-turbo',
          input: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt },
            ],
          },
          parameters: { result_format: 'text', temperature: 0.85, top_p: 0.9, seed: Math.floor(Math.random() * 2147483647), max_tokens: 800, incremental_output: true },
        }),
      });

      if (!aiResponse.ok) {
        let errText = '';
        try { errText = await aiResponse.text(); } catch (e) { /* ignore */ }
        return new Response(new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ error: 'AI请求失败', detail: aiResponse.status + ': ' + errText }) + '\n\n'));
            controller.close();
          }
        }), { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
      }

      const stream = new TransformStream();
      const writer = stream.writable.getWriter();
      const reader = aiResponse.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      (async function processStream() {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (let li = 0; li < lines.length; li++) {
              const line = lines[li].trim();
              if (!line || line.indexOf(':') < 0) continue;
              if (line.indexOf('data:') !== 0) continue;
              const jsonStr = line.substring(5).trim();
              if (!jsonStr || jsonStr === '[DONE]') continue;
              try {
                const evt = JSON.parse(jsonStr);
                let delta = '';
                if (evt?.output && typeof evt.output.text === 'string') {
                  delta = evt.output.text;
                } else if (evt && typeof evt.output === 'string') {
                  delta = evt.output;
                }
                if (delta) {
                  fullText += delta;
                  const sseData = JSON.stringify({ delta, text: fullText });
                  writer.write(new TextEncoder().encode('data: ' + sseData + '\n\n'));
                }
              } catch (parseErr) {
                /* skip unparseable chunks */
              }
            }
          }
          const dedupResult = checkDuplicate(fullText.trim(), recentComments, 0.6);
          const donePayload = JSON.stringify({ done: true, answer: fullText.trim(), sources: finalSources, chunk_count: retrievedChunks.length, retrieval_method: retrievalMethod, dedup: { similarity: dedupResult.maxSimilarity, is_duplicate: dedupResult.isDuplicate } });
          writer.write(new TextEncoder().encode('data: ' + donePayload + '\n\n'));
        } catch (streamErr) {
          try {
            writer.write(new TextEncoder().encode('data: ' + JSON.stringify({ error: '流式输出中断', detail: String(streamErr) }) + '\n\n'));
          } catch (e2) { /* ignore */ }
        } finally {
          try { writer.close(); } catch (e3) { /* ignore */ }
        }
      })();

      return new Response(stream.readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Non-streaming mode
    const aiResponseNonStream = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + qwenApiKey },
      body: JSON.stringify({
        model: 'qwen-turbo',
        input: {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        },
        parameters: { result_format: 'text', temperature: 0.85, top_p: 0.9, seed: Math.floor(Math.random() * 2147483647), max_tokens: 800 },
      }),
    });
    const result = (await aiResponseNonStream.json()) as any;
    let text = '';
    try { text = (result?.output?.text || '').trim(); } catch (e) {}

    const dedupResultNonStream = checkDuplicate(text, recentComments, 0.6);
    return Response.json({ answer: text, sources: finalSources, chunk_count: retrievedChunks.length, retrieval_method: retrievalMethod, dedup: { similarity: dedupResultNonStream.maxSimilarity, is_duplicate: dedupResultNonStream.isDuplicate } }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return Response.json({ error: '服务器内部错误', detail: String(error) }, { status: 500 });
  }
};