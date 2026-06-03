import type { PagesFunction } from "@cloudflare/workers-types";

interface Env {
  DB: D1Database;
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
      const parts = token.split(".");
      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padLen = (4 - payloadB64.length % 4) % 4;
      tokenData = JSON.parse(atob(payloadB64 + "=".repeat(padLen)));
    } catch (e) {
      return Response.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { feedback: feedbackValue } = body;

    if (feedbackValue !== 1 && feedbackValue !== -1) {
      return Response.json(
        { error: "Feedback must be 1 (👍) or -1 (👎)" },
        { status: 400 }
      );
    }

    if (!env.DB) {
      return Response.json(
        { error: "Database not available" },
        { status: 503 }
      );
    }

    const comment = await env.DB.prepare(
      `SELECT * FROM comments WHERE id = ? AND user_id = ?`
    ).bind(commentId, tokenData.sub || tokenData.user_id || tokenData.id).first();

    if (!comment) {
      return Response.json({ error: "Comment not found" }, { status: 404 });
    }

    await env.DB.prepare(
      `UPDATE comments SET feedback = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(feedbackValue, commentId).run();

    console.log(`User ${tokenData.sub || tokenData.user_id || tokenData.id} submitted feedback ${feedbackValue} for comment ${commentId}`);

    return Response.json({
      success: true,
      message: "Feedback submitted successfully",
      feedback: feedbackValue,
    });
  } catch (error) {
    console.error("Submit feedback error:", error);
    return Response.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
};
