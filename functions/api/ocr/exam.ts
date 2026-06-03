import { json } from '../../utils/response';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: '未授权，请先登录' }, 401);
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = JSON.parse(atob(token.split('.')[1]));
    } catch {
      return json({ error: '无效的认证令牌' }, 401);
    }

    if (!payload?.userId) {
      return json({ error: '无效的用户信息' }, 401);
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return json({ error: '请上传成绩单图片' }, 400);
    }

    if (!imageFile.type.startsWith('image/')) {
      return json({ error: '文件格式错误，请上传图片文件（支持 JPG/PNG/WebP）' }, 400);
    }

    if (imageFile.size > 10 * 1024 * 1024) {
      return json({ error: '图片大小不能超过10MB' }, 400);
    }

    const qwenApiKey = env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return json({ error: 'AI服务未配置' }, 500);
    }

    const arrayBuffer = await imageFile.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = imageFile.type || 'image/jpeg';

    const systemPrompt = `你是一个专业的成绩单OCR识别助手。你的任务是从用户上传的成绩单图片中提取表格数据。

**重要规则**：
1. 必须准确识别图片中的所有文字和数字
2. 将数据结构化为JSON数组格式
3. 每条记录包含：考试名称、科目、分数、满分（默认100）、班级平均分（可选）、排名（可选）
4. 如果图片中包含学生姓名，将其作为考试名称的一部分
5. 分数必须是数字类型
6. 如果某列无法识别或为空，使用null

**输出格式要求**：
- 必须返回纯JSON数组，不要包含任何其他文字说明
- 数组中的每个对象代表一行成绩记录
- 字段名必须使用中文：examName(考试名称), subject(科目), score(分数), fullScore(满分), classAvg(班级平均分), rank(排名)

示例输出：
[{"examName":"期中考试","subject":"数学","score":92,"fullScore":100,"classAvg":85.5,"rank":3},{"examName":"期中考试","subject":"语文","score":88,"fullScore":100}]`;

    const userPrompt = `请识别这张成绩单图片中的所有成绩数据，严格按照上述规则输出JSON数组。`;

    const ocrResponse = await fetch(
      'https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qwenApiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen-vl-max',
          input: {
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: [
                  {
                    image: `data:${mimeType};base64,${base64Image}`,
                  },
                  {
                    text: userPrompt,
                  },
                ],
              },
            ],
          },
          parameters: {
            result_format: 'message',
            temperature: 0.1,
            top_p: 0.2,
          },
        }),
      }
    );

    if (!ocrResponse.ok) {
      console.error('OCR API Error:', ocrResponse.status, await ocrResponse.text());
      return json({ error: 'AI识别服务暂时不可用，请稍后重试' }, 503);
    }

    const ocrResult = await ocrResponse.json();

    let extractedText = '';
    try {
      const choices = ocrResult.output?.choices;
      if (choices && choices.length > 0) {
        const messageContent = choices[0]?.message?.content;
        if (Array.isArray(messageContent)) {
          extractedText = messageContent.find(item => item.text)?.text || '';
        } else if (typeof messageContent === 'string') {
          extractedText = messageContent;
        }
      }
    } catch (e) {
      console.error('Parse OCR response error:', e);
    }

    if (!extractedText) {
      return json({ error: '未能从图片中提取到有效数据，请确保图片清晰且包含成绩信息' }, 422);
    }

    let parsedRecords;
    try {
      const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      parsedRecords = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse OCR result:', parseError);
      return json({
        error: 'AI识别结果解析失败',
        rawText: extractedText.substring(0, 500),
        hint: '系统已尝试提取数据但格式异常，您可以手动录入或重新拍照'
      }, 422);
    }

    if (!Array.isArray(parsedRecords) || parsedRecords.length === 0) {
      return json({ error: '未能识别到有效成绩记录，请确保图片清晰可读' }, 422);
    }

    const normalizedRecords = parsedRecords.map((record: Record<string, unknown>, index: number) => ({
      id: `ocr_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 9)}`,
      examName: String(record.examName || record['考试名称'] || '').trim(),
      subject: String(record.subject || record['科目'] || '').trim(),
      score: record.score != null ? Number(record.score) : null,
      fullScore: record.fullScore != null ? Number(record.fullScore) : (record.满分 != null ? Number(record.满分) : 100),
      classAvg: record.classAvg != null ? Number(record.classAvg) : (record['班级平均分'] != null ? Number(record['班级平均分']) : null),
      rank: record.rank != null ? Math.round(Number(record.rank)) : (record['排名'] != null ? Math.round(Number(record['排名'])) : null),
      examDate: '',
      isValid: true,
      errors: [] as string[],
    })).filter((rec: { examName: string; subject: string }) => {
      return rec.examName !== '' || rec.subject !== '';
    });

    if (normalizedRecords.length === 0) {
      return json({ error: '识别结果为空，请确保图片包含有效的成绩数据' }, 422);
    }

    return json({
      success: true,
      count: normalizedRecords.length,
      records: normalizedRecords,
      rawExtractedText: extractedText.substring(0, 200),
    });
  } catch (error) {
    console.error('OCR processing error:', error);
    return json({
      error: '处理失败，请稍后重试',
      details: error instanceof Error ? error.message : '未知错误'
    }, 500);
  }
};
