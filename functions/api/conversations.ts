interface Env {
  DB: D1Database;
  QWEN_API_KEY: string;
  JWT_SECRET: string;
}

export default async function conversationsHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/conversations', '');

  if (request.method === 'GET' && (path === '/' || path === '')) {
    return getConversations(request, env);
  }

  if (request.method === 'POST' && (path === '/' || path === '')) {
    return createConversation(request, env);
  }

  if (request.method === 'PUT' && path.startsWith('/')) {
    const id = path.split('/')[1];
    return updateConversation(request, env, id);
  }

  if (request.method === 'DELETE' && path.match(/^\/[a-zA-Z0-9-]+$/)) {
    const id = path.split('/')[1];
    return deleteConversation(request, env, id);
  }

  if (request.method === 'DELETE' && path.match(/^\/student\/[^/]+$/)) {
    const studentId = path.split('/')[2];
    return deleteStudentConversations(request, env, studentId);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

function authenticateUser(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  return verifyJWT(token, env.JWT_SECRET);
}

async function verifyStudentOwnership(env: Env, userId: string, studentId: string): Promise<boolean> {
  const student = await env.DB.prepare(
    'SELECT id FROM students WHERE id = ? AND user_id = ?'
  ).bind(studentId, userId).first();
  return !!student;
}

const VALID_TYPES = ['daily', 'discipline', 'praise', 'psychological', 'goal'];

const TYPE_LABELS: Record<string, { zh: string; en: string }> = {
  daily: { zh: '日常沟通', en: 'Daily Chat' },
  discipline: { zh: '纪律谈话', en: 'Discipline Talk' },
  praise: { zh: '表扬鼓励', en: 'Praise & Encouragement' },
  psychological: { zh: '心理疏导', en: 'Psychological Counseling' },
  goal: { zh: '目标规划', en: 'Goal Planning' },
};

const TYPE_TEMPLATES: Record<string, { placeholder: string; followUpHint: string }> = {
  daily: {
    placeholder: '记录日常交流内容，如：了解最近学习状态、询问作业完成情况、关心生活琐事等...',
    followUpHint: '如：持续关注、定期检查作业、与家长保持联系',
  },
  discipline: {
    placeholder: '记录纪律问题及谈话要点，如：课堂违纪情况、迟到原因分析、行为纠正措施等...',
    followUpHint: '如：制定行为改进计划、约定观察期、联系家长配合',
  },
  praise: {
    placeholder: '记录表扬鼓励的内容，如：进步表现、优秀事迹、竞赛获奖等...',
    followUpHint: '如：班级公开表扬、推荐参加活动、树立榜样',
  },
  psychological: {
    placeholder: '记录心理疏导内容，如：情绪变化原因、压力来源、疏导方向等...',
    followUpHint: '如：持续关注情绪状态、必要时转介专业咨询、家校协同',
  },
  goal: {
    placeholder: '记录目标规划内容，如：学业目标设定、升学意向讨论、能力提升计划等...',
    followUpHint: '如：分解阶段性目标、定期复盘进度、提供资源支持',
  },
};

async function getConversations(request: Request, env: Env) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    const conversationType = url.searchParams.get('type');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '20') || 20, 1), 100);

    if (!studentId) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 student_id 参数' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const hasAccess = await verifyStudentOwnership(env, user.id, studentId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权访问该学生的数据' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    let sql = `
      SELECT * FROM student_conversations
      WHERE user_id = ? AND student_id = ?
    `;
    const params: any[] = [user.id, studentId];

    if (conversationType && VALID_TYPES.includes(conversationType)) {
      sql += ` AND conversation_type = ?`;
      params.push(conversationType);
    }

    sql += ` ORDER BY conversation_date DESC, created_at DESC LIMIT ?`;
    params.push(limit);

    const result = await env.DB.prepare(sql).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      total: result.results?.length || 0,
      templates: TYPE_LABELS
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Get conversations error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createConversation(request: Request, env: Env) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const {
      student_id,
      conversation_type,
      category,
      content,
      student_reaction,
      follow_up,
      conversation_date
    } = body;

    if (!student_id) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 student_id' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!conversation_type || !VALID_TYPES.includes(conversation_type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `conversation_type 必须为以下值之一: ${VALID_TYPES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '谈话内容不能为空' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!conversation_date) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 conversation_date' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const hasAccess = await verifyStudentOwnership(env, user.id, student_id);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权操作该学生的数据' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO student_conversations (
        user_id, student_id, conversation_type, category, content,
        student_reaction, follow_up, conversation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id, student_id, conversation_type,
      category || null, content.trim(),
      student_reaction || null, follow_up || null, conversation_date
    ).run();

    if (result.success) {
      const newRecord = await env.DB.prepare(
        'SELECT * FROM student_conversations WHERE rowid = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify({
        success: true, data: newRecord, message: '谈话记录添加成功'
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error('Failed to create conversation record');
  } catch (error: any) {
    console.error('Create conversation error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateConversation(request: Request, env: Env, id: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM student_conversations WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '谈话记录不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { conversation_type, category, content, student_reaction, follow_up, conversation_date } = body;

    if (conversation_type && !VALID_TYPES.includes(conversation_type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `conversation_type 必须为以下值之一: ${VALID_TYPES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await env.DB.prepare(`
      UPDATE student_conversations SET
        conversation_type = COALESCE(?, conversation_type),
        category = COALESCE(?, category),
        content = COALESCE(?, content),
        student_reaction = COALESCE(?, student_reaction),
        follow_up = COALESCE(?, follow_up),
        conversation_date = COALESCE(?, conversation_date)
      WHERE id = ?
    `).bind(
      conversation_type ?? null, category ?? null, content ?? null,
      student_reaction ?? null, follow_up ?? null, conversation_date ?? null, id
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM student_conversations WHERE id = ?'
    ).bind(id).first();

    return new Response(JSON.stringify({
      success: true, data: updated, message: '谈话记录更新成功'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Update conversation error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteConversation(request: Request, env: Env, id: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM student_conversations WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '谈话记录不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare('DELETE FROM student_conversations WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true, message: '谈话记录已删除' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Delete conversation error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteStudentConversations(request: Request, env: Env, studentId: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const hasAccess = await verifyStudentOwnership(env, user.id, studentId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权操作该学生的数据' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.DB.prepare(
      'DELETE FROM student_conversations WHERE user_id = ? AND student_id = ?'
    ).bind(user.id, studentId).run();

    return new Response(JSON.stringify({
      success: true,
      data: { deleted_count: result.meta.changes || 0 },
      message: `已删除该学生的 ${result.meta.changes || 0} 条谈话记录`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Delete student conversations error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

function verifyJWT(token: string, secret: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}
