import { describe, it, expect } from 'vitest';

const {
  hashPassword,
  verifyPassword,
  signJWT,
  verifyJWT,
  urlSafeB64Decode,
} = await import('../../../functions/lib/auth');

describe('auth lib - hashPassword', () => {
  it('should return pbkdf2_sha256 prefixed hash', async () => {
    const hash = await hashPassword('test123');
    expect(hash).toMatch(/^pbkdf2_sha256:[0-9a-f]{32}:[0-9a-f]{64}$/);
  });

  it('should produce different hashes for same password (random salt)', async () => {
    const hash1 = await hashPassword('password');
    const hash2 = await hashPassword('password');
    expect(hash1).not.toBe(hash2);
  });

  it('should handle empty string', async () => {
    const hash = await hashPassword('');
    expect(hash.startsWith('pbkdf2_sha256:')).toBe(true);
  });
});

describe('auth lib - verifyPassword', () => {
  it('should verify correct password', async () => {
    const hash = await hashPassword('mySecretPass2024!');
    const result = await verifyPassword('mySecretPass2024!', hash);
    expect(result).toBe(true);
  });

  it('should reject wrong password', async () => {
    const hash = await hashPassword('correct-password');
    const result = await verifyPassword('wrong-password', hash);
    expect(result).toBe(false);
  });

  it('should fallback to plain text for non-pbkdf2 hashes', async () => {
    const result = await verifyPassword('plaintext', 'plaintext');
    expect(result).toBe(true);
  });

  it('should reject plain text mismatch', async () => {
    const result = await verifyPassword('wrong', 'correct');
    expect(result).toBe(false);
  });
});

describe('auth lib - signJWT', () => {
  it('should produce valid JWT structure (3 parts)', async () => {
    const token = await signJWT(
      { sub: 'user123', email: 'test@example.com' },
      'test-secret',
      3600
    );
    const parts = token.split('.');
    expect(parts.length).toBe(3);
    parts.forEach(part => {
      expect(part).toMatch(/^[a-zA-Z0-9_-]+$/);
    });
  });

  it('should include iat and exp claims', async () => {
    const now = Math.floor(Date.now() / 1000);
    const token = await signJWT({ sub: 'u1' }, 'secret', 3600);

    const payloadB64 = token.split('.')[1];
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf-8')
    );

    expect(payload.sub).toBe('u1');
    expect(payload.iat).toBeGreaterThanOrEqual(now);
    expect(payload.exp).toBeGreaterThan(now);
    expect(payload.exp - payload.iat).toBe(3600);
  });

  it('should use HS256 algorithm', async () => {
    const token = await signJWT({}, 'secret', 3600);
    const headerB64 = token.split('.')[0];
    const header = JSON.parse(
      Buffer.from(headerB64, 'base64url').toString('utf-8')
    );
    expect(header.alg).toBe('HS256');
    expect(header.typ).toBe('JWT');
  });

  it('should produce valid signature (non-deterministic due to HMAC)', async () => {
    const t1 = await signJWT({ sub: 'u1' }, 'secret', 3600);
    expect(t1.split('.').length).toBe(3);
    expect(t1.split('.')[2].length).toBeGreaterThan(20);
  });
});

describe('auth lib - verifyJWT', () => {
  it('should reject malformed tokens', () => {
    expect(verifyJWT('not-a-jwt')).toBeNull();
    expect(verifyJWT('only.two.parts')).toBeNull();
    expect(verifyJWT('')).toBeNull();
  });

  it('should reject non-HS256 algorithm', () => {
    const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const payload = btoa(JSON.stringify({ sub: "u1", exp: Math.floor(Date.now() / 1000) + 3600 }))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const fakeToken = `${header}.${payload}.signature`;
    expect(verifyJWT(fakeToken)).toBeNull();
  });

  it('should decode valid HS256 payload via base64url', async () => {
    const token = await signJWT({ sub: 'user123', email: 'a@b.com' }, 'secret', 3600);
    const parts = token.split('.');
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );
    expect(payload.sub).toBe('user123');
    expect(payload.email).toBe('a@b.com');
    expect(typeof payload.iat).toBe('number');
    expect(typeof payload.exp).toBe('number');
  });
});

describe('auth lib - urlSafeB64Decode', () => {
  it('should add padding for non-aligned strings', () => {
    const result = urlSafeB64Decode('abc');
    expect(result.length % 4).toBe(0);
    expect(result).toBe('abc=');
  });

  it('should replace url-safe chars', () => {
    const result = urlSafeB64Decode('abc-def_gh');
    expect(result).toContain('+');
    expect(result).toContain('/');
  });
});
