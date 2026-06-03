export default async function classesHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/classes', '');

  // GET /api/classes - 获取班级列表
  if (request.method === 'GET' && path === '/' || path === '') {
    return getClasses(request, env);
  }

  // POST /api/classes - 创建班级
  if (request.method === 'POST' && (path === '/' || path === '')) {
    return createClass(request, env);
  }

  // PUT /api/classes/:id - 更新班级
  if (request.method === 'PUT' && path.startsWith('/')) {
    const classId = path.split('/')[1];
    return updateClass(request, env, classId);
  }

  // DELETE /api/classes/:id - 删除班级
  if (request.method === 'DELETE' && path.startsWith('/')) {
    const classId = path.split('/')[1];
    return deleteClass(request, env, classId);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getClasses(request: Request, env: Env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyJWT(token, env.JWT_SECRET);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 查询班级列表及每个班的学生数量
    const classes = await env.DB.prepare(`
      SELECT c.*, 
             (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) as student_count
      FROM classes c 
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `).bind(user.id).all();

    return new Response(JSON.stringify({
      success: true,
      classes: classes.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get classes error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createClass(request: Request, env: Env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyJWT(token, env.JWT_SECRET);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, grade, academic_year } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '班级名称不能为空'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查免费用户限制（最多1个班级）
    const userRecord = await env.DB.prepare(
      'SELECT plan_type FROM users WHERE id = ?'
    ).bind(user.id).first();

    const isPremium = userRecord?.plan_type !== 'free';
    
    if (!isPremium) {
      const existingClasses = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM classes WHERE user_id = ?'
      ).bind(user.id).first();

      if ((existingClasses?.count || 0) >= 1) {
        return new Response(JSON.stringify({ 
          error: 'Quota Exceeded',
          message: '免费用户最多只能创建1个班级，升级到专业版可创建更多',
          upgrade_url: '/membership'
        }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const result = await env.DB.prepare(`
      INSERT INTO classes (user_id, name, grade, academic_year)
      VALUES (?, ?, ?, ?)
    `).bind(user.id, name.trim(), grade || null, academic_year || null).run();

    if (result.success) {
      const newClass = await env.DB.prepare(
        'SELECT * FROM classes WHERE rowid = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify({
        success: true,
        class: newClass,
        message: '班级创建成功'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Failed to create class');
    }

  } catch (error) {
    console.error('Create class error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateClass(request: Request, env: Env, classId: string) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyJWT(token, env.JWT_SECRET);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证班级属于当前用户
    const existingClass = await env.DB.prepare(
      'SELECT * FROM classes WHERE id = ? AND user_id = ?'
    ).bind(classId, user.id).first();

    if (!existingClass) {
      return new Response(JSON.stringify({ error: 'Class not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, grade, academic_year } = body;

    await env.DB.prepare(`
      UPDATE classes SET name = ?, grade = ?, academic_year = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(name || existingClass.name, grade || existingClass.grade, academic_year || existingClass.academic_year, classId).run();

    const updatedClass = await env.DB.prepare(
      'SELECT * FROM classes WHERE id = ?'
    ).bind(classId).first();

    return new Response(JSON.stringify({
      success: true,
      class: updatedClass,
      message: '班级更新成功'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update class error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteClass(request: Request, env: Env, classId: string) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyJWT(token, env.JWT_SECRET);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证班级属于当前用户
    const existingClass = await env.DB.prepare(
      'SELECT * FROM classes WHERE id = ? AND user_id = ?'
    ).bind(classId, user.id).first();

    if (!existingClass) {
      return new Response(JSON.stringify({ error: 'Class not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 删除班级（级联删除学生）
    await env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(classId).run();

    return new Response(JSON.stringify({
      success: true,
      message: '班级已删除（相关学生数据也已删除）'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete class error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// JWT 验证辅助函数（简化版）
function verifyJWT(token: string, secret: string): any {
  try {
    // 这里应该使用完整的 JWT 验证逻辑
    // 简化示例：解析 base64 payload
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    
    // 检查过期时间
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}
