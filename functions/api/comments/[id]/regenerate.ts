import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
  QWEN_API_KEY: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const commentId = params.id as string;

  try {
    if (!commentId) {
      return Response.json({ error: "Comment ID is required" }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let tokenData: any;
    try {
      tokenData = JSON.parse(atob(token));
    } catch (e) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    if (!env.DB) {
      return Response.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const comment = await env.DB.prepare(
      `SELECT * FROM comments WHERE id = ? AND user_id = ?`
    ).bind(commentId, tokenData.id).first();

    if (!comment) {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }

    const qwenApiKey = env.QWEN_API_KEY;
    if (!qwenApiKey) {
      return Response.json(
        { error: "AI service not configured", code: "AI_NOT_CONFIGURED" },
        { status: 503 }
      );
    }

    const studentName = comment.student_name;
    const traits = JSON.parse(comment.traits || "[]");
    const commentType = comment.comment_type || "summary";
    const toneStyle = comment.tone_style || "formal";
    const lang = request.headers.get("Accept-Language")?.includes("en") ? "en" : "zh";

    const traitMap: Record<string, string> = {
      attitude: lang === "zh"
        ? "学习态度端正，课堂上认真听讲"
        : "Has a positive learning attitude and listens attentively",
      performance: lang === "zh"
        ? "课堂表现积极，能主动参与讨论和回答问题"
        : "Active in class, participates in discussions and answers questions",
      homework: lang === "zh"
        ? "作业完成认真，书写工整规范"
        : "Completes homework carefully with neat and standard handwriting",
      relationship: lang === "zh"
        ? "与同学相处融洽，乐于帮助他人"
        : "Gets along well with classmates and is willing to help others",
      creativity: lang === "zh"
        ? "思维活跃，有独特的创新见解"
        : "Thinks actively and has unique creative insights",
      responsibility: lang === "zh"
        ? "责任心强，能认真完成各项任务"
        : "Strong sense of responsibility, completes tasks seriously",
    };

    const typeDescMap: Record<string, string> = {
      summary: lang === "zh" ? "期末总结：对本学期整体表现的全面回顾" : "End-of-term summary",
      encouragement: lang === "zh" ? "日常鼓励：发现闪光点并给予正向激励" : "Daily encouragement",
      improvement: lang === "zh" ? "改进建议：指出需要提升的方面并提出建议" : "Improvement suggestions",
      parent: lang === "zh" ? "家长沟通：适合向家长汇报学生情况的口吻" : "Parent communication",
    };

    const toneDescMap: Record<string, string> = {
      formal: lang === "zh" ? "正式亲切：专业但不失温度的书面语风格" : "Formal yet warm",
      warm: lang === "zh" ? "温暖鼓励：充满关爱和正能量的语气" : "Warmly encouraging",
      objective: lang === "zh" ? "客观中立：公正描述事实，不带主观色彩" : "Objective and neutral",
    };

    const traitLabels = traits.map((t: string) => traitMap[t] || t).join("；");
    const systemPrompt = lang === "zh"
      ? '你是一位拥有15年教学经验的资深教师，擅长撰写温暖而有洞察力的学生评语。你的评语风格：具体而不空泛、真诚而不敷衍、鼓励中带有建设性建议。每条评语应体现对学生的个性化关注，避免模板化语言。字数控制在100-300字之间。直接输出评语正文，不要加标题或前缀。'
      : 'You are an experienced teacher with 15 years of expertise in writing warm and insightful student comments. Your style: specific not generic, sincere not perfunctory, encouraging with constructive suggestions. Each comment should show personalized attention. Keep it between 100-300 words. Output only the comment body, no title or prefix.';

    const prompt = `${lang === "zh" ? "请为以下学生撰写一条" : "Please write a "}${typeDescMap[commentType]}${lang === "zh" ? "风格的评语。" : " style comment."}

${lang === "zh" ? "【学生姓名】" : "[Student Name]"} ${studentName}
${traitLabels ? `${lang === "zh" ? "【学生特点】" : "[Student Traits]"} ${traitLabels}` : ""}
${lang === "zh" ? "【语气要求】" : "[Tone]"} ${toneDescMap[toneStyle]}

${lang === "zh"
  ? "要求：\n1. 字数控制在100-300字\n2. 具体而不空泛，避免套话\n3. 至少提到2个具体的行为或场景\n4. 结尾给予温暖或具体的期望\n5. 直接输出评语正文"
  : "Requirements:\n1. 100-300 words\n2. Specific, not generic cliches\n3. Mention at least 2 specific behaviors/scenarios\n4. End with warmth or concrete expectations\n5. Output only the comment text"}`;

    const aiResponse = await fetch(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${qwenApiKey}`,
        },
        body: JSON.stringify({
          model: "qwen-turbo",
          input: {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt },
            ],
          },
          parameters: {
            result_format: "text",
            temperature: 0.85,
            top_p: 0.9,
            seed: Math.floor(Math.random() * 2147483647),
            max_tokens: 800,
          },
        }),
      },
    );

    if (!aiResponse.ok) {
      console.error("Qwen API error:", await aiResponse.text());
      return Response.json({ error: "AI generation failed", code: "AI_FAILED" }, { status: 502 });
    }

    const result = await aiResponse.json() as any;
    const commentText = result?.output?.text?.trim() || "";

    if (!commentText) {
      return Response.json({ error: "AI returned empty content", code: "AI_EMPTY_RESPONSE" }, { status: 500 });
    }

    await env.DB.prepare(
      `UPDATE comments SET content = ?, model_used = 'qwen-turbo', updated_at = datetime('now') WHERE id = ?`
    ).bind(commentText, commentId).run();

    const updatedComment = await env.DB.prepare(
      `SELECT * FROM comments WHERE id = ?`
    ).bind(commentId).first();

    return Response.json({
      success: true,
      message: "Comment regenerated successfully",
      comment: updatedComment,
    });
  } catch (error) {
    console.error("Regenerate comment error:", error);
    return Response.json(
      { error: "Failed to regenerate comment" },
      { status: 500 }
    );
  }
};
