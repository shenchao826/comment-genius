interface Env {
  DB: D1Database;
  QWEN_API_KEY: string;
  JWT_SECRET: string;
}

export default async function examsHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/exams', '');

  // GET /api/exams?student_id=xxx — 获取某学生的所有成绩记录
  if (request.method === 'GET' && (path === '/' || path === '')) {
    return getExams(request, env);
  }

  // GET /api/exams/student/xxx/latest?count=3 — 获取某学生最近N次考试
  if (request.method === 'GET' && path.match(/^\/student\/[^/]+\/latest$/)) {
    const studentId = path.split('/')[2];
    return getLatestExams(request, env, studentId);
  }

  // POST /api/exams — 添加单条成绩
  if (request.method === 'POST' && (path === '/' || path === '')) {
    return createExam(request, env);
  }

  // POST /api/exams/batch — 批量导入成绩
  if (request.method === 'POST' && path === '/batch') {
    return batchCreateExams(request, env);
  }

  // PUT /api/exams/:id — 更新成绩
  if (request.method === 'PUT' && path.startsWith('/')) {
    const examId = path.split('/')[1];
    return updateExam(request, env, examId);
  }

  // DELETE /api/exams/:id — 删除单条成绩
  if (request.method === 'DELETE' && path.match(/^\/[a-zA-Z0-9-]+$/)) {
    const examId = path.split('/')[1];
    return deleteExam(request, env, examId);
  }

  // DELETE /api/exams/student/:student_id — 删除某学生所有成绩
  if (request.method === 'DELETE' && path.match(/^\/student\/[^/]+$/)) {
    const studentId = path.split('/')[2];
    return deleteStudentExams(request, env, studentId);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 验证并获取当前用户
function authenticateUser(request: Request, env: Env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyJWT(token, env.JWT_SECRET);
}

// 验证学生属于当前用户
async function verifyStudentOwnership(env: Env, userId: string, studentId: string): Promise<boolean> {
  const student = await env.DB.prepare(
    'SELECT id FROM students WHERE id = ? AND user_id = ?'
  ).bind(studentId, userId).first();
  return !!student;
}

// GET /api/exams?student_id=xxx — 获取某学生的所有成绩记录
async function getExams(request: Request, env: Env) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const studentId = url.searchParams.get('student_id');

    if (!studentId) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 student_id 参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证该学生属于当前用户
    const hasAccess = await verifyStudentOwnership(env, user.id, studentId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权访问该学生的数据' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const exams = await env.DB.prepare(`
      SELECT * FROM exams
      WHERE user_id = ? AND student_id = ?
      ORDER BY exam_date DESC, created_at DESC
    `).bind(user.id, studentId).all();

    return new Response(JSON.stringify({
      success: true,
      data: exams.results || [],
      total: exams.results?.length || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get exams error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// GET /api/exams/student/xxx/latest?count=3 — 获取某学生最近N次考试
async function getLatestExams(request: Request, env: Env, studentId: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证该学生属于当前用户
    const hasAccess = await verifyStudentOwnership(env, user.id, studentId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权访问该学生的数据' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(request.url);
    const count = Math.min(Math.max(parseInt(url.searchParams.get('count') || '5') || 5, 1), 50);

    const exams = await env.DB.prepare(`
      SELECT * FROM exams
      WHERE user_id = ? AND student_id = ?
      ORDER BY exam_date DESC, created_at DESC
      LIMIT ?
    `).bind(user.id, studentId, count).all();

    return new Response(JSON.stringify({
      success: true,
      data: exams.results || [],
      count: exams.results?.length || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get latest exams error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/exams — 添加单条成绩
async function createExam(request: Request, env: Env) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const {
      student_id,
      exam_name,
      subject,
      score,
      full_score = 100,
      class_avg,
      class_rank,
      total_count,
      exam_date,
      semester,
      notes
    } = body;

    // 字段校验
    if (!student_id) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '缺少 student_id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!exam_name || !exam_name.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '考试名称不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!subject || !subject.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '科目不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (typeof score !== 'number' || score < 0) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '分数必须为非负数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证学生属于当前用户
    const hasAccess = await verifyStudentOwnership(env, user.id, student_id);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权操作该学生的数据' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.DB.prepare(`
      INSERT INTO exams (
        user_id, student_id, exam_name, subject, score,
        full_score, class_avg, class_rank, total_count,
        exam_date, semester, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      student_id,
      exam_name.trim(),
      subject.trim(),
      score,
      full_score || null,
      class_avg || null,
      class_rank || null,
      total_count || null,
      exam_date || null,
      semester || null,
      notes || null
    ).run();

    if (result.success) {
      const newExam = await env.DB.prepare(
        'SELECT * FROM exams WHERE rowid = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify({
        success: true,
        data: newExam,
        message: '成绩添加成功'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Failed to create exam record');
    }

  } catch (error) {
    console.error('Create exam error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST /api/exams/batch — 批量导入成绩（JSON数组）
async function batchCreateExams(request: Request, env: Env) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    let records: any[] = body;

    if (!Array.isArray(records) || records.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '请求体必须是非空JSON数组' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (records.length > 200) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '单次批量导入最多支持200条记录' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // 基础字段校验
      if (!record.student_id || !record.exam_name?.trim() || !record.subject?.trim() || typeof record.score !== 'number') {
        failedCount++;
        errors.push(`第${i + 1}条：缺少必要字段(student_id/exam_name/subject/score)`);
        continue;
      }

      if (record.score < 0) {
        failedCount++;
        errors.push(`第${i + 1}条：分数不能为负数`);
        continue;
      }

      // 验证学生归属
      const hasAccess = await verifyStudentOwnership(env, user.id, record.student_id);
      if (!hasAccess) {
        failedCount++;
        errors.push(`第${i + 1}条：学生 ${record.student_id} 不存在或不属于当前用户`);
        continue;
      }

      try {
        await env.DB.prepare(`
          INSERT INTO exams (
            user_id, student_id, exam_name, subject, score,
            full_score, class_avg, class_rank, total_count,
            exam_date, semester, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          user.id,
          record.student_id,
          record.exam_name.trim(),
          record.subject.trim(),
          record.score,
          record.full_score || null,
          record.class_avg || null,
          record.class_rank || null,
          record.total_count || null,
          record.exam_date || null,
          record.semester || null,
          record.notes || null
        ).run();
        importedCount++;
      } catch (err: any) {
        failedCount++;
        errors.push(`第${i + 1}条：${err.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        imported_count: importedCount,
        failed_count: failedCount,
        errors: errors.slice(0, 20)
      },
      message: `成功导入 ${importedCount} 条成绩${failedCount > 0 ? `，${failedCount} 条失败` : ''}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Batch create exams error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT /api/exams/:id — 更新成绩
async function updateExam(request: Request, env: Env, examId: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证记录存在且属于当前用户
    const existingExam = await env.DB.prepare(
      'SELECT * FROM exams WHERE id = ? AND user_id = ?'
    ).bind(examId, user.id).first();

    if (!existingExam) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '成绩记录不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const {
      exam_name,
      subject,
      score,
      full_score,
      class_avg,
      class_rank,
      total_count,
      exam_date,
      semester,
      notes
    } = body;

    // 分数校验
    if (score !== undefined && (typeof score !== 'number' || score < 0)) {
      return new Response(JSON.stringify({ success: false, error: 'Validation Error', message: '分数必须为非负数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(`
      UPDATE exams SET
        exam_name = COALESCE(?, exam_name),
        subject = COALESCE(?, subject),
        score = COALESCE(?, score),
        full_score = COALESCE(?, full_score),
        class_avg = COALESCE(?, class_avg),
        class_rank = COALESCE(?, class_rank),
        total_count = COALESCE(?, total_count),
        exam_date = COALESCE(?, exam_date),
        semester = COALESCE(?, semester),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      exam_name || null,
      subject || null,
      score ?? null,
      full_score ?? null,
      class_avg ?? null,
      class_rank ?? null,
      total_count ?? null,
      exam_date ?? null,
      semester ?? null,
      notes ?? null,
      examId
    ).run();

    const updatedExam = await env.DB.prepare(
      'SELECT * FROM exams WHERE id = ?'
    ).bind(examId).first();

    return new Response(JSON.stringify({
      success: true,
      data: updatedExam,
      message: '成绩更新成功'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update exam error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE /api/exams/:id — 删除单条成绩
async function deleteExam(request: Request, env: Env, examId: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证记录存在且属于当前用户
    const existingExam = await env.DB.prepare(
      'SELECT * FROM exams WHERE id = ? AND user_id = ?'
    ).bind(examId, user.id).first();

    if (!existingExam) {
      return new Response(JSON.stringify({ success: false, error: 'Not Found', message: '成绩记录不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare('DELETE FROM exams WHERE id = ?').bind(examId).run();

    return new Response(JSON.stringify({
      success: true,
      message: '成绩已删除'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete exam error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE /api/exams/student/:student_id — 删除某学生所有成绩
async function deleteStudentExams(request: Request, env: Env, studentId: string) {
  try {
    const user = authenticateUser(request, env);
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized', message: '未登录或token无效' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证学生属于当前用户
    const hasAccess = await verifyStudentOwnership(env, user.id, studentId);
    if (!hasAccess) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden', message: '无权操作该学生的数据' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.DB.prepare(
      'DELETE FROM exams WHERE user_id = ? AND student_id = ?'
    ).bind(user.id, studentId).run();

    return new Response(JSON.stringify({
      success: true,
      data: { deleted_count: result.meta.changes || 0 },
      message: `已删除该学生的 ${result.meta.changes || 0} 条成绩记录`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete student exams error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// JWT 验证辅助函数
function verifyJWT(token: string, secret: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}
