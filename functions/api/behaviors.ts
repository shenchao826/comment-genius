interface Env {
  DB: D1Database;
  QWEN_API_KEY: string;
  JWT_SECRET: string;
}

export default async function behaviorsHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/behaviors', '');

  if (request.method === 'GET' && (path === '/' || path === '')) {
    return getBehaviors(request, env);
  }

  if (request.method === 'POST' && (path === '/' || path === '')) {
    return createBehavior(request, env);
  }

  if (request.method === 'PUT' && path.startsWith('/')) {
    const id = path.split('/')[1];
    return updateBehavior(request, env, id);
  }

  if (request.method === 'DELETE' && path.match(/^\/[a-zA-Z0-9-]+$/)) {
    const id = path.split('/')[1];
    return deleteBehavior(request, env, id);
  }

  if (request.method === 'DELETE' && path.match(/^\/student\/[^/]+$/)) {
    const studentId = path.split('/')[2];
    return deleteStudentBehaviors(request, env, studentId);
  }

  if (request.method === 'GET' && path.match(/^\/summary\/[^/]+$/)) {
    const studentId = path.split('/')[2];
    return getBehaviorSummary(request, env, studentId);
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

const VALID_TYPES = ['praise', 'warning', 'punishment'];
const VALID_CATEGORIES = ['classroom', 'homework', 'activity', 'discipline', 'other'];

const TYPE_LABELS: Record<string, { zh: string; en: string; icon: string; color: string }> = {
  praise: { zh: '表扬', en: 'Praise', icon: '🌟', color: 'emerald' },
  warning: { zh: '提醒', en: 'Warning', icon: '⚡', color: 'amber' },
  punishment: { zh: '惩罚', en: 'Punishment', icon: '🔴', color: 'red' },
};

const CATEGORY_LABELS: Record<string, { zh: string; en: string }> = {
  classroom: { zh: '课堂表现', en: 'Classroom' },
  homework: { zh: '作业情况', en: 'Homework' },
  activity: { zh: '活动参与', en: 'Activity' },
  discipline: { zh: '纪律表现', en: 'Discipline' },
  other: { zh: '其他', en: 'Other' },
};

const QUICK_TAGS: Record<string, string[]> = {
  praise: ['积极发言', '帮助同学', '认真听讲', '作业优秀', '主动提问', '乐于分享', '拾金不昧', '进步明显'],
  warning: ['上课走神', '作业迟交', '交头接耳', '迟到早退', '忘记带书', '字迹潦草'],
  punishment: ['扰乱课堂', '欺凌同学', '考试作弊', '顶撞老师', '损坏公物'],
};

async function getBehaviors(request: Request, env: Env) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    const behaviorType = url.searchParams.get('type');
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '30') || 30, 1), 200);

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

    let sql = `SELECT * FROM student_behaviors WHERE user_id = ? AND student_id = ?`;
    const params: any[] = [user.id, studentId];

    if (behaviorType && VALID_TYPES.includes(behaviorType)) {
      sql += ` AND behavior_type = ?`;
      params.push(behaviorType);
    }

    sql += ` ORDER BY record_date DESC, created_at DESC LIMIT ?`;
    params.push(limit);

    const result = await env.DB.prepare(sql).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      total: result.results?.length || 0,
      templates: TYPE_LABELS,
      categories: CATEGORY_LABELS,
      quickTags: QUICK_TAGS,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Get behaviors error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getBehaviorSummary(request: Request, env: Env, studentId: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const hasAccess = await verifyStudentOwnership(env, user.id, studentId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const typeCounts = await env.DB.prepare(`
      SELECT behavior_type, COUNT(*) as count, COALESCE(SUM(points), 0) as total_points
      FROM student_behaviors
      WHERE user_id = ? AND student_id = ?
      GROUP BY behavior_type
    `).bind(user.id, studentId).all();

    const totalCount = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM student_behaviors WHERE user_id = ? AND student_id = ?
    `).bind(user.id, studentId).first();

    const recentPraises = await env.DB.prepare(`
      SELECT behavior_tag, description, record_date FROM student_behaviors
      WHERE user_id = ? AND student_id = ? AND behavior_type = 'praise'
      ORDER BY record_date DESC LIMIT 5
    `).bind(user.id, studentId).all();

    const recentWarnings = await env.DB.prepare(`
      SELECT behavior_tag, description, record_date FROM student_behaviors
      WHERE user_id = ? AND student_id = ? AND behavior_type IN ('warning', 'punishment')
      ORDER BY record_date DESC LIMIT 5
    `).bind(user.id, studentId).all();

    return new Response(JSON.stringify({
      success: true,
      data: {
        total_records: totalCount?.total || 0,
        by_type: typeCounts.results || [],
        recent_praises: recentPraises.results || [],
        recent_warnings: recentWarnings.results || [],
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('Get behavior summary error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function createBehavior(request: Request, env: Env) {
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
      behavior_type,
      behavior_category,
      behavior_tag,
      description,
      points,
      record_date,
    } = body;

    if (!student_id) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 student_id' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!behavior_type || !VALID_TYPES.includes(behavior_type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `behavior_type 必须为以下值之一: ${VALID_TYPES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!behavior_category || !VALID_CATEGORIES.includes(behavior_category)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `behavior_category 必须为以下值之一: ${VALID_CATEGORIES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!record_date) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 record_date' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    const hasAccess = await verifyStudentOwnership(env, user.id, student_id);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权操作该学生的数据' }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      });
    }

    const autoPoints = points ?? (
      behavior_type === 'praise' ? 1 :
      behavior_type === 'warning' ? -1 : -2
    );

    const result = await env.DB.prepare(`
      INSERT INTO student_behaviors (
        user_id, student_id, behavior_type, behavior_category,
        behavior_tag, description, points, record_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id, student_id, behavior_type, behavior_category,
      behavior_tag || null, description || null, autoPoints, record_date
    ).run();

    if (result.success) {
      const newRecord = await env.DB.prepare(
        'SELECT * FROM student_behaviors WHERE rowid = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify({
        success: true, data: newRecord, message: '行为记录添加成功'
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error('Failed to create behavior record');
  } catch (error: any) {
    console.error('Create behavior error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateBehavior(request: Request, env: Env, id: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM student_behaviors WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '行为记录不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { behavior_type, behavior_category, behavior_tag, description, points, record_date } = body;

    if (behavior_type && !VALID_TYPES.includes(behavior_type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `behavior_type 必须为以下值之一: ${VALID_TYPES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (behavior_category && !VALID_CATEGORIES.includes(behavior_category)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `behavior_category 必须为以下值之一: ${VALID_CATEGORIES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await env.DB.prepare(`
      UPDATE student_behaviors SET
        behavior_type = COALESCE(?, behavior_type),
        behavior_category = COALESCE(?, behavior_category),
        behavior_tag = COALESCE(?, behavior_tag),
        description = COALESCE(?, description),
        points = COALESCE(?, points),
        record_date = COALESCE(?, record_date)
      WHERE id = ?
    `).bind(
      behavior_type ?? null, behavior_category ?? null, behavior_tag ?? null,
      description ?? null, points !== undefined ? String(points) : null,
      record_date ?? null, id
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM student_behaviors WHERE id = ?'
    ).bind(id).first();

    return new Response(JSON.stringify({
      success: true, data: updated, message: '行为记录更新成功'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Update behavior error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteBehavior(request: Request, env: Env, id: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM student_behaviors WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '行为记录不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare('DELETE FROM student_behaviors WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true, message: '行为记录已删除' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Delete behavior error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteStudentBehaviors(request: Request, env: Env, studentId: string) {
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
      'DELETE FROM student_behaviors WHERE user_id = ? AND student_id = ?'
    ).bind(user.id, studentId).run();

    return new Response(JSON.stringify({
      success: true,
      data: { deleted_count: result.meta.changes || 0 },
      message: `已删除该学生的 ${result.meta.changes || 0} 条行为记录`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Delete student behaviors error:', error);
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
