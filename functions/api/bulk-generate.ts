export default async function bulkGenerateHandler(request: Request, env: Env) {
  // POST /api/comments/bulk-generate - 创建批量任务
  if (request.method === 'POST') {
    return createBulkJob(request, env);
  }

  // GET /api/comments/bulk-job/:jobId - 查询进度
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const jobId = url.pathname.split('/').pop();
    
    if (url.pathname.includes('/results')) {
      return getBulkJobResults(request, env, jobId!);
    }
    
    return getBulkJobStatus(request, env, jobId!);
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

// 存储批量任务的内存对象（生产环境应使用 Durable Objects 或外部存储）
const bulkJobs = new Map<string, any>();

async function createBulkJob(request: Request, env: Env) {
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
    const { class_id, student_ids, style, length_type, comment_type, custom_prompts } = body;

    // 验证参数
    if (!class_id || !student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '缺少必要参数'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (student_ids.length > 60) {
      return new Response(JSON.stringify({ 
        error: 'Validation Error',
        message: '单次批量生成最多支持60名学生'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 创建批量任务
    const jobId = generateUUID();
    const job = {
      id: jobId,
      user_id: user.id,
      class_id,
      student_ids,
      style: style || 'gentle',
      length_type: length_type || 'standard',
      comment_type: comment_type || 'general',
      custom_prompts: custom_prompts || {},
      total: student_ids.length,
      completed: 0,
      status: 'pending',
      results: [],
      created_at: new Date().toISOString(),
      estimated_seconds: student_ids.length * 3 // 每个学生约3秒
    };

    bulkJobs.set(jobId, job);

    // 异步执行批量生成
    executeBulkGeneration(jobId, env);

    return new Response(JSON.stringify({
      success: true,
      bulk_job_id: jobId,
      total: job.total,
      completed: 0,
      status: 'processing',
      estimated_seconds: job.estimated_seconds
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create bulk job error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getBulkJobStatus(request: Request, env: Env, jobId: string) {
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

    const job = bulkJobs.get(jobId);

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 验证任务属于当前用户
    if (job.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      id: job.id,
      total: job.total,
      completed: job.completed,
      status: job.status,
      estimated_seconds: job.estimated_seconds
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get bulk job status error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getBulkJobResults(request: Request, env: Env, jobId: string) {
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

    const job = bulkJobs.get(jobId);

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (job.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      results: job.results,
      total: job.results.length,
      succeeded: job.results.filter((r: any) => r.success).length,
      failed: job.results.filter((r: any) => !r.success).length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get bulk job results error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 异步执行批量生成任务
async function executeBulkGeneration(jobId: string, env: Env) {
  const job = bulkJobs.get(jobId);
  if (!job) return;

  job.status = 'processing';

  for (let i = 0; i < job.student_ids.length; i++) {
    const studentId = job.student_ids[i];
    
    try {
      // 获取学生信息
      const student = await env.DB.prepare(
        'SELECT * FROM students WHERE id = ?'
      ).bind(studentId).first();

      if (!student) {
        job.results.push({
          student_id: studentId,
          student_name: 'Unknown',
          success: false,
          error: 'Student not found'
        });
        job.completed++;
        continue;
      }

      // 获取该学生的自定义提示（如果有）
      const customPrompt = job.custom_prompts[studentId] || null;

      // 调用 AI 生成评语（复用现有的生成逻辑）
      const result = await generateSingleComment({
        student_name: student.name,
        traits: [],
        style: job.style,
        length_type: job.length_type,
        comment_type: job.comment_type,
        custom_prompt: customPrompt,
        user_id: job.user_id,
        student_id: studentId,
        env
      });

      if (result.success) {
        job.results.push({
          student_id: studentId,
          student_name: student.name,
          success: true,
          content: result.content,
          comment_id: result.comment_id
        });
      } else {
        job.results.push({
          student_id: studentId,
          student_name: student.name,
          success: false,
          error: result.error
        });
      }

    } catch (error) {
      job.results.push({
        student_id: studentId,
        student_name: 'Unknown',
        success: false,
        error: error.message
      });
    }

    job.completed++;
    
    // 更新任务状态到存储
    bulkJobs.set(jobId, { ...job });
    
    // 添加小延迟避免触发速率限制
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  job.status = 'completed';
  bulkJobs.set(jobId, { ...job });
}

// 单条评语生成函数（简化版，实际应调用现有的 generate-comment.ts）
async function generateSingleComment(params: any): Promise<any> {
  try {
    // 这里应该调用实际的 AI 生成逻辑
    // 简化示例：返回模拟数据
    
    const commentId = generateUUID();
    
    // 保存到数据库
    await params.env.DB.prepare(`
      INSERT INTO comments (
        user_id, student_id, student_name, content, traits,
        comment_type, tone_style, comment_length, supplement
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      params.user_id,
      params.student_id,
      params.student_name,
      `这是为${params.student_name}生成的${params.comment_type}类型评语...`,
      JSON.stringify(params.traits || []),
      params.comment_type,
      params.style,
      params.length_type,
      params.custom_prompt || ''
    ).run();

    return {
      success: true,
      content: `这是为${params.student_name}生成的评语内容...`,
      comment_id: commentId
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// UUID 生成器
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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
