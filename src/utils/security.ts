const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateRandomKey(length: number = 32): string {
  let key = '';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    key += ALPHABET[values[i] % ALPHABET.length];
  }
  return key;
}

export async function generateEncryptionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('raw', key);
  return String.fromCharCode(...new Uint8Array(exported));
}

export async function encryptData(plaintext: string, keyString?: string): Promise<{ encrypted: string; iv: string }> {
  try {
    let key: CryptoKey;
    
    if (keyString) {
      const keyData = new Uint8Array(keyString.split('').map(c => c.charCodeAt(0)));
      key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
    } else {
      key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    const encryptedArray = new Uint8Array(encrypted);
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));

    if (!keyString) {
      const exportedKey = await crypto.subtle.exportKey('raw', key);
      const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
      localStorage.setItem('enc_key', keyBase64);
    }

    return {
      encrypted: encryptedBase64,
      iv: ivBase64,
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('加密失败');
  }
}

export async function decryptData(encryptedBase64: string, ivBase64: string, keyString?: string): Promise<string> {
  try {
    let key: CryptoKey;
    
    if (!keyString) {
      const storedKey = localStorage.getItem('enc_key');
      if (!storedKey) throw new Error('未找到解密密钥');
      keyString = storedKey;
    }

    const keyData = new Uint8Array(atob(keyString).split('').map(c => c.charCodeAt(0)));
    key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const iv = new Uint8Array(atob(ivBase64).split('').map(c => c.charCodeAt(0)));
    const encryptedData = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('解密失败');
  }
}

export function hashData(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || typeof data !== 'string') {
    return '***';
  }
  
  const trimmedData = data.trim();
  
  if (trimmedData.length <= visibleChars * 2) {
    return '*'.repeat(trimmedData.length);
  }
  
  const start = trimmedData.slice(0, visibleChars);
  const end = trimmedData.slice(-visibleChars);
  const maskedLength = Math.max(0, trimmedData.length - visibleChars * 2);
  const maskChar = '*';
  
  // 确保脱敏后的字符串长度与原始一致
  return `${start}${maskChar.repeat(maskedLength)}${end}`;
}

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/expression\s*\(([^)]*)\)/gi, '')
    .replace(/url\s*\(([^)]*)\)/gi, '');

  // 移除控制字符
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  
  // 限制长度防止DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized.trim();
}

export function sanitizeHTML(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  const tempDiv = document.createElement('div');
  tempDiv.textContent = input;
  return tempDiv.innerHTML;
}

export class SecureStorage {
  private prefix: string;

  constructor(prefix: string = 'sec_') {
    this.prefix = prefix;
  }

  async setItem(key: string, value: string): Promise<void> {
    const fullKey = `${this.prefix}${key}`;
    try {
      const result = await encryptData(value);
      localStorage.setItem(fullKey, JSON.stringify(result));
    } catch {
      localStorage.setItem(fullKey, btoa(encodeURIComponent(value)));
    }
  }

  async getItem(key: string): Promise<string | null> {
    const fullKey = `${this.prefix}${key}`;
    const stored = localStorage.getItem(fullKey);
    
    if (!stored) return null;

    try {
      const { encrypted, iv } = JSON.parse(stored);
      return await decryptData(encrypted, iv);
    } catch {
      try {
        return decodeURIComponent(atob(stored));
      } catch {
        return null;
      }
    }
  }

  removeItem(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`);
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}

export const secureStorage = new SecureStorage();

export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  requireStrongPassword: boolean;
  enableAuditLog: boolean;
}

export const defaultSecurityConfig: SecurityConfig = {
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000,
  sessionTimeout: 24 * 60 * 60 * 1000,
  requireStrongPassword: true,
  enableAuditLog: true,
};

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 25;
  } else {
    feedback.push('密码长度至少8位');
  }

  if (/[a-z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('需要包含小写字母');
  }

  if (/[A-Z]/.test(password)) {
    score += 15;
  } else {
    feedback.push('需要包含大写字母');
  }

  if (/[0-9]/.test(password)) {
    score += 15;
  } else {
    feedback.push('需要包含数字');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 30;
  } else {
    feedback.push('需要包含特殊字符');
  }

  return {
    isValid: score >= 70,
    score,
    feedback,
  };
}
