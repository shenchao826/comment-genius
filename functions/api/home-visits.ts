interface Env {
  DB: D1Database;
  QWEN_API_KEY: string;
  JWT_SECRET: string;
}

export default async function homeVisitsHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/home-visits', '');

  if (request.method === 'GET' && (path === '/' || path === '')) {
    return getHomeVisits(request, env);
  }

  if (request.method === 'POST' && (path === '/' || path === '')) {
    return createHomeVisit(request, env);
  }

  if (request.method === 'PUT' && path.startsWith('/')) {
    const id = path.split('/')[1];
    return updateHomeVisit(request, env, id);
  }

  if (request.method === 'DELETE' && path.match(/^\/[a-zA-Z0-9-]+$/)) {
    const id = path.split('/')[1];
    return deleteHomeVisit(request, env, id);
  }

  if (request.method === 'DELETE' && path.match(/^\/student\/[^/]+$/)) {
    const studentId = path.split('/')[2];
    return deleteStudentHomeVisits(request, env, studentId);
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

const VALID_VISIT_TYPES = ['in_person', 'phone', 'video', 'school_meeting'];

const VISIT_TYPE_LABELS: Record<string, { zh: string; en: string; icon: string }> = {
  in_person: { zh: '上门家访', en: 'In-Person Visit', icon: '🏠' },
  phone: { zh: '电话家访', en: 'Phone Call', icon: '📞' },
  video: { zh: '视频家访', en: 'Video Call', icon: '📹' },
  school_meeting: { zh: '到校面谈', en: 'School Meeting', icon: '🏫' },
};

const VISIT_TYPE_TEMPLATES: Record<string, { purposePlaceholder: string; topicsHint: string }> = {
  in_person: {
    purposePlaceholder: '如：了解家庭环境、反馈在校表现、建立家校信任关系...',
    topicsHint: '学习习惯、作息规律、亲子关系、课外兴趣、同伴交往',
  },
  phone: {
    purposePlaceholder: '如：反馈近期表现、通知重要事项、协调教育方式...',
    topicsHint: '成绩波动、作业态度、考勤情况、心理健康、安全事项',
  },
  video: {
    purposePlaceholder: '如：展示学生作品、远程家长会、多方协同会议...',
    topicsHint: '线上学习效果、视力健康、电子产品使用、体育锻炼',
  },
  school_meeting: {
    purposePlaceholder: '如：家长到校面谈、班主任接待日、专题咨询...',
    topicsHint: '升学规划、选科指导、特困帮扶、投诉处理、表彰颁奖',
  },
};

async function getHomeVisits(request: Request, env: Env) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');
    const visitType = url.searchParams.get('type');
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
      SELECT * FROM student_home_visits
      WHERE user_id = ? AND student_id = ?
    `;
    const params: any[] = [user.id, studentId];

    if (visitType && VALID_VISIT_TYPES.includes(visitType)) {
      sql += ` AND visit_type = ?`;
      params.push(visitType);
    }

    sql += ` ORDER BY visit_date DESC, created_at DESC LIMIT ?`;
    params.push(limit);

    const result = await env.DB.prepare(sql).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      total: result.results?.length || 0,
      templates: VISIT_TYPE_LABELS
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Get home visits error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createHomeVisit(request: Request, env: Env) {
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
      visit_type,
      visit_purpose,
      family_structure,
      key_topics,
      consensus,
      follow_plan,
      visit_date
    } = body;

    if (!student_id) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 student_id' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!visit_type || !VALID_VISIT_TYPES.includes(visit_type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `visit_type 必须为以下值之一: ${VALID_VISIT_TYPES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    if (!visit_date) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 visit_date' }), {
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
      INSERT INTO student_home_visits (
        user_id, student_id, visit_type, visit_purpose, family_structure,
        key_topics, consensus, follow_plan, visit_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id, student_id, visit_type,
      visit_purpose || null, family_structure || null,
      key_topics || null, consensus || null, follow_plan || null, visit_date
    ).run();

    if (result.success) {
      const newRecord = await env.DB.prepare(
        'SELECT * FROM student_home_visits WHERE rowid = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify({
        success: true, data: newRecord, message: '家访记录添加成功'
      }), { status: 201, headers: { 'Content-Type': 'application/json' } });
    }

    throw new Error('Failed to create home visit record');
  } catch (error: any) {
    console.error('Create home visit error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateHomeVisit(request: Request, env: Env, id: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM student_home_visits WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '家访记录不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { visit_type, visit_purpose, family_structure, key_topics, consensus, follow_plan, visit_date } = body;

    if (visit_type && !VALID_VISIT_TYPES.includes(visit_type)) {
      return new Response(JSON.stringify({
        success: false, error: 'Validation Error',
        message: `visit_type 必须为以下值之一: ${VALID_VISIT_TYPES.join(', ')}`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    await env.DB.prepare(`
      UPDATE student_home_visits SET
        visit_type = COALESCE(?, visit_type),
        visit_purpose = COALESCE(?, visit_purpose),
        family_structure = COALESCE(?, family_structure),
        key_topics = COALESCE(?, key_topics),
        consensus = COALESCE(?, consensus),
        follow_plan = COALESCE(?, follow_plan),
        visit_date = COALESCE(?, visit_date)
      WHERE id = ?
    `).bind(
      visit_type ?? null, visit_purpose ?? null, family_structure ?? null,
      key_topics ?? null, consensus ?? null, follow_plan ?? null, visit_date ?? null, id
    ).run();

    const updated = await env.DB.prepare(
      'SELECT * FROM student_home_visits WHERE id = ?'
    ).bind(id).first();

    return new Response(JSON.stringify({
      success: true, data: updated, message: '家访记录更新成功'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Update home visit error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteHomeVisit(request: Request, env: Env, id: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    const existing = await env.DB.prepare(
      'SELECT * FROM student_home_visits WHERE id = ? AND user_id = ?'
    ).bind(id, user.id).first();

    if (!existing) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '家访记录不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare('DELETE FROM student_home_visits WHERE id = ?').bind(id).run();

    return new Response(JSON.stringify({ success: true, message: '家访记录已删除' }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Delete home visit error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', message: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteStudentHomeVisits(request: Request, env: Env, studentId: string) {
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
      'DELETE FROM student_home_visits WHERE user_id = ? AND student_id = ?'
    ).bind(user.id, studentId).run();

    return new Response(JSON.stringify({
      success: true,
      data: { deleted_count: result.meta.changes || 0 },
      message: `已删除该学生的 ${result.meta.changes || 0} 条家访记录`
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Delete student home visits error:', error);
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
