import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
}

function parseToken(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - payloadB64.length % 4) % 4;
    return JSON.parse(atob(payloadB64 + "=".repeat(padLen)));
  } catch {
    return null;
  }
}

function auth(request: Request): { userId: string; tokenData: any } | Response {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const tokenData = parseToken(token);
  if (!tokenData) return Response.json({ error: "Invalid token" }, { status: 401 });

  const userId = tokenData.sub || tokenData.user_id || tokenData.id;
  if (!userId) return Response.json({ error: "Invalid token payload" }, { status: 401 });

  return { userId, tokenData };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const result = auth(request);
    if (result instanceof Response) return result;

    if (!env.DB) {
      return Response.json({
        comments: [],
        total: 0,
      });
    }

    const dbResult = await env.DB.prepare(
      `SELECT * FROM comments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`
    ).bind(result.userId).all();

    return Response.json({
      comments: dbResult.results || [],
      total: (dbResult.results || []).length,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    return Response.json({ error: "Failed to fetch comments" }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const result = auth(request);
    if (result instanceof Response) return result;

    const body = await request.json();
    const {
      student_name,
      content,
      traits,
      class_role,
      comment_type = "summary",
      tone_style = "formal",
      comment_length = "standard",
      model_used = "manual",
    } = body;

    if (!student_name || !content) {
      return Response.json({ error: "student_name and content are required" }, { status: 400 });
    }

    if (!env.DB) {
      return Response.json({ error: "Database not available" }, { status: 503 });
    }

    const commentId = `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await env.DB.prepare(
      `INSERT INTO comments (id, user_id, student_name, content, traits, class_role, comment_type, tone_style, comment_length, model_used)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(commentId, result.userId, student_name, content, JSON.stringify(traits || []), class_role || null, comment_type, tone_style, comment_length, model_used).run();

    const saved = await env.DB.prepare(`SELECT * FROM comments WHERE id = ?`).bind(commentId).first();

    return Response.json({ success: true, message: "Comment created", comment: saved }, { status: 201 });
  } catch (error) {
    console.error("Create comment error:", error);
    return Response.json({ error: "Failed to create comment" }, { status: 500 });
  }
};
