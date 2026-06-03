/**
 * JSON 响应辅助函数 - Cloudflare Pages Functions
 */
export function json(data: unknown, status = 200, init?: ResponseInit): Response {
  return Response.json(data, { ...init, status });
}
