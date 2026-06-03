export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
  skipAuth?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  ok: boolean;
  headers: Headers;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30000, ...init } = options;

  const controller = new AbortController();
  const timeoutId = timeout > 0
    ? setTimeout(() => controller.abort(), timeout)
    : undefined;

  try {
    const response = await fetch(url, {
      ...init,
      signal: options.signal || controller.signal,
    });
    return response;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers: customHeaders,
    signal,
    timeout = 30000,
    skipAuth = false,
  } = options;

  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };

  // 自动添加认证头
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  const init: RequestInit = {
    method,
    headers: requestHeaders,
    signal,
  };

  if (body !== undefined && method !== 'GET') {
    init.body = typeof body === 'string'
      ? body
      : JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetchWithTimeout(url, { ...init, timeout });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw Object.assign(new Error('请求已取消'), {
        code: 'ABORTED',
        isAbort: true
      });
    }

    throw Object.assign(new Error('网络连接失败，请检查网络后重试'), {
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      originalError: error
    });
  }

  let data: T = undefined as T;

  // 处理空响应（如 204 No Content）
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      throw Object.assign(new Error('响应解析失败'), {
        code: 'PARSE_ERROR',
        status: response.status
      });
    }
  } else if (response.status !== 204) {
    data = await response.text() as unknown as T;
  }

  // 统一错误处理
  if (!response.ok) {
    const errorData = typeof data === 'object' && data !== null ? data : {};
    const errorMessage =
      (errorData as Record<string, unknown>)?.error ||
      (errorData as Record<string, unknown>)?.message ||
      `请求失败 (${response.status})`;

    const error = new Error(typeof errorMessage === 'string' ? errorMessage : String(errorMessage));
    
    Object.assign(error, {
      code: String(response.status).startsWith('4')
        ? `CLIENT_ERROR_${response.status}`
        : `SERVER_ERROR_${response.status}`,
      status: response.status,
      responseData: errorData
    });

    throw error;
  }

  return {
    data,
    status: response.status,
    ok: response.ok,
    headers: response.headers,
  };
}

// 便捷方法
export const api = {
  get: <T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),

  put: <T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiClient<T>(endpoint, { ...options, method: 'PUT', body }),

  patch: <T>(endpoint: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),

  delete: <T>(endpoint: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};

// 文件上传专用
export async function uploadFile(
  endpoint: string,
  file: File | Blob,
  fieldName: string = 'file',
  additionalData?: Record<string, string>,
  onProgress?: (percent: number) => void
): Promise<ApiResponse> {
  const formData = new FormData();
  formData.append(fieldName, file);

  if (additionalData) {
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });
  }

  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      let data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = xhr.responseText;
      }

      resolve({
        data,
        status: xhr.status,
        ok: xhr.status >= 200 && xhr.status < 300,
        headers: {} as Headers,
      });
    });

    xhr.addEventListener('error', () => {
      reject(Object.assign(new Error('上传失败'), { code: 'UPLOAD_ERROR', isNetworkError: true }));
    });

    xhr.open('POST', endpoint.startsWith('/') ? endpoint : `/${endpoint}`);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    xhr.send(formData);
  });
}
