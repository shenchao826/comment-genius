export default async function studentsHandler(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/students', '');
  const classId = url.searchParams.get('class_id');

  // GET /api/students - 获取学生列表
  if (request.method === 'GET' && (path === '/' || path === '')) {
    return getStudents(request, env, classId);
  }

  // POST /api/students - 添加学生
  if (request.method === 'POST' && path === '/import') {
    return importStudents(request, env);
  }

  if (request.method === 'POST' && (path === '/' || path === '')) {
    return createStudent(request, env);
  }

  // PUT /api/students/:id - 更新学生
  if (request.method === 'PUT' && path.startsWith('/')) {
    const studentId = path.split('/')[1];
    return updateStudent(request, env, studentId);
  }

  // DELETE /api/students/:id - 删除学生
  if (request.method === 'DELETE' && path.startsWith('/')) {
    const studentId = path.split('/')[1];
    return deleteStudent(request, env, studentId);
  }

  // GET /api/students/export - 导出学生
  if (request.method === 'GET' && path === '/export') {
    return exportStudents(request, env, classId);
  }

  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function getStudents(request: Request, env: Env, classId?: string | null) {
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

    let query = `
      SELECT s.*,
             (SELECT COUNT(*) FROM comments c WHERE c.student_id = s.id) as comment_count
      FROM students s
      WHERE s.user_id = ?
    `;
    const params: any[] = [user.id];

    if (classId) {
      query += ' AND s.class_id = ?';
      params.push(classId);
    }

    query += ' ORDER BY s.created_at ASC';

    const students = await env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      students: students.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get students error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function createStudent(request: Request, env: Env) {
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
    const { name, class_id, gender, student_number, notes } = body;

    if (!name || !name.trim()) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '学生姓名不能为空'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!class_id) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '必须指定班级ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证班级存在且属于当前用户
    const classExists = await env.DB.prepare(
      'SELECT id FROM classes WHERE id = ? AND user_id = ?'
    ).bind(class_id, user.id).first();

    if (!classExists) {
      return new Response(JSON.stringify({ error: 'Class not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 检查免费用户限制（每班最多20人）
    const userRecord = await env.DB.prepare(
      'SELECT plan_type FROM users WHERE id = ?'
    ).bind(user.id).first();

    const isPremium = userRecord?.plan_type !== 'free';
    
    if (!isPremium) {
      const studentCount = await env.DB.prepare(
        'SELECT COUNT(*) as count FROM students WHERE class_id = ?'
      ).bind(class_id).first();

      if ((studentCount?.count || 0) >= 20) {
        return new Response(JSON.stringify({ 
          error: 'Quota Exceeded',
          message: '免费用户每班最多20名学生，升级到专业版可添加更多',
          upgrade_url: '/membership'
        }), {
          status: 402,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const result = await env.DB.prepare(`
      INSERT INTO students (class_id, user_id, name, gender, student_number, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      class_id,
      user.id,
      name.trim(),
      gender || null,
      student_number || null,
      notes || null
    ).run();

    if (result.success) {
      const newStudent = await env.DB.prepare(
        'SELECT * FROM students WHERE rowid = ?'
      ).bind(result.meta.last_row_id).first();

      return new Response(JSON.stringify({
        success: true,
        student: newStudent,
        message: '学生添加成功'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Failed to create student');
    }

  } catch (error) {
    console.error('Create student error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function updateStudent(request: Request, env: Env, studentId: string) {
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

    // 验证学生属于当前用户
    const existingStudent = await env.DB.prepare(
      'SELECT * FROM students WHERE id = ? AND user_id = ?'
    ).bind(studentId, user.id).first();

    if (!existingStudent) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, gender, student_number, notes } = body;

    await env.DB.prepare(`
      UPDATE students SET 
        name = COALESCE(?, name),
        gender = COALESCE(?, gender),
        student_number = COALESCE(?, student_number),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(name || null, gender || null, student_number || null, notes || null, studentId).run();

    const updatedStudent = await env.DB.prepare(
      'SELECT * FROM students WHERE id = ?'
    ).bind(studentId).first();

    return new Response(JSON.stringify({
      success: true,
      student: updatedStudent,
      message: '学生信息更新成功'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update student error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function deleteStudent(request: Request, env: Env, studentId: string) {
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

    // 验证学生属于当前用户
    const existingStudent = await env.DB.prepare(
      'SELECT * FROM students WHERE id = ? AND user_id = ?'
    ).bind(studentId, user.id).first();

    if (!existingStudent) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare('DELETE FROM students WHERE id = ?').bind(studentId).run();

    return new Response(JSON.stringify({
      success: true,
      message: '学生已删除'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete student error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function importStudents(request: Request, env: Env) {
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const classId = formData.get('class_id') as string;

    if (!file) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '请上传文件'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!classId) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '必须指定班级ID'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证班级
    const classExists = await env.DB.prepare(
      'SELECT id FROM classes WHERE id = ? AND user_id = ?'
    ).bind(classId, user.id).first();

    if (!classExists) {
      return new Response(JSON.stringify({ error: 'Class not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 读取文件内容
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '文件格式错误：至少需要表头和一行数据'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 解析 CSV（简单实现）
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const dataLines = lines.slice(1);

    let importedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim());
      const record: Record<string, string> = {};
      
      header.forEach((key, index) => {
        record[key] = values[index] || '';
      });

      const name = record['姓名'] || record['name'];
      if (!name || !name.trim()) {
        failedCount++;
        errors.push(`第${dataLines.indexOf(line) + 2}行：缺少姓名`);
        continue;
      }

      try {
        await env.DB.prepare(`
          INSERT INTO students (class_id, user_id, name, gender, notes)
          VALUES (?, ?, ?, ?, ?)
        `).bind(
          classId,
          user.id,
          name.trim(),
          record['性别'] || record['gender'] || null,
          record['备注'] || record['notes'] || null
        ).run();
        
        importedCount++;
      } catch (error) {
        failedCount++;
        errors.push(`${name}: ${error.message}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      imported_count: importedCount,
      failed_count: failedCount,
      errors: errors.slice(0, 10), // 只返回前10个错误
      message: `成功导入 ${importedCount} 名学生${failedCount > 0 ? `，${failedCount} 条失败` : ''}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Import students error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function exportStudents(request: Request, env: Env, classId?: string | null) {
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

    let query = 'SELECT * FROM students WHERE user_id = ?';
    const params: any[] = [user.id];

    if (classId) {
      query += ' AND class_id = ?';
      params.push(classId);
    }

    query += ' ORDER BY name ASC';

    const students = await env.DB.prepare(query).bind(...params).all();

    // 生成 CSV
    const csvContent = [
      ['序号', '姓名', '性别', '学号', '备注'],
      ...(students.results || []).map((s: any, i: number) => [
        i + 1,
        s.name,
        s.gender || '',
        s.student_number || '',
        s.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    return new Response('\ufeff' + csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="students_export.csv"'
      }
    });

  } catch (error) {
    console.error('Export students error:', error);
    return new Response(JSON.stringify({ 
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
