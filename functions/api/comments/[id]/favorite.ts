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

    const currentFavorited = comment.is_favorited === 1 || comment.is_favorited === true;

    await env.DB.prepare(
      `UPDATE comments SET is_favorited = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(!currentFavorited, commentId).run();

    if (!currentFavorited) {
      await env.DB.prepare(
        `INSERT OR IGNORE INTO favorites (user_id, comment_id) VALUES (?, ?)`
      ).bind(tokenData.sub || tokenData.user_id || tokenData.id, commentId).run();
    } else {
      await env.DB.prepare(
        `DELETE FROM favorites WHERE user_id = ? AND comment_id = ?`
      ).bind(tokenData.sub || tokenData.user_id || tokenData.id, commentId).run();
    }

    return Response.json({
      success: true,
      message: currentFavorited ? "Removed from favorites" : "Added to favorites",
      is_favorited: !currentFavorited,
    });
  } catch (error) {
    console.error("Toggle favorite error:", error);
    return Response.json(
      { error: "Failed to toggle favorite" },
      { status: 500 }
    );
  }
};
