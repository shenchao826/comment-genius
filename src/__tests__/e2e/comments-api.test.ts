// @ts-nocheck — E2E test requires running server; type-check skipped
import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://127.0.0.1:8787';
let authToken: string;
let userId: string;
let testCommentId: string;

function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
  });
}

function json<T = any>(res: Response): Promise<T> {
  return res.json();
}

beforeAll(async () => {
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test@dev.local',
      password: 'test123456',
    }),
  });
  const data = await loginRes.json();
  authToken = data.access_token || data.token;
  userId = data.user?.id;
  console.log('[beforeAll] login status:', loginRes.status, 'token:', authToken ? `${authToken.substring(0,20)}...` : 'NONE');
});

describe('Comments API - E2E', () => {
  describe('GET /api/comments - list comments', () => {
    it('should return 401 without token', async () => {
      const res = await fetch(`${BASE}/api/comments`);
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBeDefined();
    });

    it('should return list for authenticated user', async () => {
      const res = await api('/api/comments');
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(Array.isArray(body.comments)).toBe(true);
      expect(typeof body.total).toBe('number');
    });
  });

  describe('POST /api/comments - save comment', () => {
    it('should create a new comment successfully', async () => {
      const res = await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          student_name: 'TestStudent',
          content: 'Test comment content.',
          traits: ['good'],
          comment_type: 'summary',
          tone_style: 'formal',
          comment_length: 'standard',
        }),
      });
      expect(res.status).toBe(201);
      const body = await json(res);
      expect(body.success).toBe(true);
      expect(body.comment).toBeDefined();
      expect(body.comment.student_name).toBe('TestStudent');
      expect(body.comment.content).toContain('Test comment');
      testCommentId = body.comment.id;
    });

    it('should reject missing required fields', async () => {
      const res = await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/comments/:id - get comment detail', () => {
    it('should return comment by id', async () => {
      if (!testCommentId) return;
      const res = await api(`/api/comments/${testCommentId}`);
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.comment).toBeDefined();
      expect(body.comment.id).toBe(testCommentId);
    });

    it('should return 404 for non-existent comment', async () => {
      const res = await api('/api/comments/nonexistent-id-12345');
      expect([404, 400]).toContain(res.status);
    });
  });

  describe('PUT /api/comments/:id - update comment', () => {
    it('should update comment content', async () => {
      if (!testCommentId) return;
      const res = await api(`/api/comments/${testCommentId}`, {
        method: 'PUT',
        body: JSON.stringify({
          content: '更新后的评语内容：该生本学期进步显著。',
          traits: ['认真听讲', '积极思考', '乐于助人'],
          tone_style: 'warm',
        }),
      });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.success).toBe(true);
      expect(body.comment.content).toContain('更新后');
    });
  });

  describe('POST /api/comments/:id/favorite - toggle favorite', () => {
    it('should toggle favorite on/off', async () => {
      if (!testCommentId) return;
      const r1 = await api(`/api/comments/${testCommentId}/favorite`, { method: 'POST' });
      expect(r1.status).toBe(200);
      expect((await json(r1)).is_favorited).toBe(true);

      const r2 = await api(`/api/comments/${testCommentId}/favorite`, { method: 'POST' });
      expect((await json(r2)).is_favorited).toBe(false);

      const r3 = await api(`/api/comments/${testCommentId}/favorite`, { method: 'POST' });
      expect((await json(r3)).is_favorited).toBe(true);
    });
  });

  describe('DELETE /api/comments/:id - delete comment', () => {
    it('should delete existing comment', async () => {
      if (!testCommentId) return;
      const res = await api(`/api/comments/${testCommentId}`, { method: 'DELETE' });
      expect(res.status).toBe(200);
      expect((await json(res)).success).toBe(true);
    });
  });

  describe('Feedback endpoint', () => {
    it('should accept feedback', async () => {
      const createRes = await api('/api/comments', {
        method: 'POST',
        body: JSON.stringify({
          student_name: '反馈学生',
          content: '用于反馈测试的评语。',
          traits: ['测试'],
          comment_type: '日常鼓励',
        }),
      });
      const created = await json(createRes);
      const cid = created.comment?.id;
      if (!cid) return;

      const fbRes = await api(`/api/comments/${cid}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ feedback_type: 'helpful' }),
      });
      expect(fbRes.status).toBe(200);
      expect((await json(fbRes)).success).toBe(true);
    });
  });
});
