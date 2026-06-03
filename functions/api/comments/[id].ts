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
  } catch { return null; }
}

function auth(request: Request): { userId: string; data: any } | Response {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const td = parseToken(token);
  if (!td) return Response.json({ error: "Invalid token" }, { status: 401 });
  const uid = td.sub || td.user_id || td.id;
  if (!uid) return Response.json({ error: "Invalid token payload" }, { status: 401 });
  return { userId: uid, data: td };
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const commentId = params.id as string;

  try {
    if (!commentId) return Response.json({ error: "Comment ID required" }, { status: 400 });

    const r = auth(request);
    if (r instanceof Response) return r;

    if (!env.DB) return Response.json({ error: "DB unavailable" }, { status: 503 });

    const comment = await env.DB.prepare(`SELECT * FROM comments WHERE id = ? AND user_id = ?`).bind(commentId, r.userId).first();
    if (!comment) return Response.json({ error: "Comment not found" }, { status: 404 });
    return Response.json({ comment });
  } catch (error) {
    console.error("Get comment error:", error);
    return Response.json({ error: "Failed to fetch comment" }, { status: 500 });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const commentId = params.id as string;

  try {
    if (!commentId) return Response.json({ error: "Comment ID required" }, { status: 400 });

    const r = auth(request);
    if (r instanceof Response) return r;

    const body = await request.json();
    const { content, traits, comment_type, tone_style, comment_length, supplement } = body;

    if (!env.DB) return Response.json({ error: "DB unavailable" }, { status: 503 });

    const existing = await env.DB.prepare(`SELECT * FROM comments WHERE id = ? AND user_id = ?`).bind(commentId, r.userId).first();
    if (!existing) return Response.json({ error: "Comment not found" }, { status: 404 });

    const fields: string[] = [];
    const values: any[] = [];

    if (content !== undefined) { fields.push("content = ?"); values.push(content); }
    if (traits !== undefined) { fields.push("traits = ?"); values.push(JSON.stringify(traits)); }
    if (comment_type !== undefined) { fields.push("comment_type = ?"); values.push(comment_type); }
    if (tone_style !== undefined) { fields.push("tone_style = ?"); values.push(tone_style); }
    if (comment_length !== undefined) { fields.push("comment_length = ?"); values.push(comment_length); }
    if (supplement !== undefined) { fields.push("supplement = ?"); values.push(supplement); }

    if (fields.length === 0) return Response.json({ error: "No fields to update" }, { status: 400 });

    fields.push("updated_at = datetime('now')");
    values.push(commentId, r.userId);

    await env.DB.prepare(`UPDATE comments SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).bind(...values).run();

    const updated = await env.DB.prepare(`SELECT * FROM comments WHERE id = ?`).bind(commentId).first();
    return Response.json({ success: true, message: "Updated", comment: updated });
  } catch (error) {
    console.error("Update error:", error);
    return Response.json({ error: "Failed to update" }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;
  const commentId = params.id as string;

  try {
    if (!commentId) return Response.json({ error: "Comment ID required" }, { status: 400 });

    const r = auth(request);
    if (r instanceof Response) return r;

    if (!env.DB) return Response.json({ error: "DB unavailable" }, { status: 503 });

    const existing = await env.DB.prepare(`SELECT * FROM comments WHERE id = ? AND user_id = ?`).bind(commentId, r.userId).first();
    if (!existing) return Response.json({ error: "Comment not found" }, { status: 404 });

    await env.DB.prepare(`DELETE FROM comments WHERE id = ? AND user_id = ?`).bind(commentId, r.userId).run();
    await env.DB.prepare(`DELETE FROM favorites WHERE user_id = ? AND comment_id = ?`).bind(r.userId, commentId).run();

    return Response.json({ success: true, message: "Deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    return Response.json({ error: "Failed to delete" }, { status: 500 });
  }
};
