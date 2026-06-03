const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor() {
    this.baseUrl = API_BASE_URL;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json'
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || 'Request failed',
          response.status,
          errorData.message || `HTTP Error: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      console.error(`API request failed [${endpoint}]:`, error);
      throw new ApiError(
        'Network Error',
        0,
        error instanceof Error ? error.message : 'Unknown network error'
      );
    }
  }

  // Auth APIs
  async login(email: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(data: { email: string; password: string; name: string }) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async logout() {
    this.setToken(null);
  }

  // Comment APIs
  async generateComment(params: {
    student_name?: string;
    trait_ids: string[];
    style: string;
    length_type: string;
    comment_type?: string;
    custom_prompt?: string;
  }) {
    return this.request<any>('/comments/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getComments(params?: { page?: number; limit?: number }) {
    const query = params 
      ? `?${new URLSearchParams(params as any).toString()}`
      : '';
    return this.request<any>(`/comments${query}`);
  }

  async getComment(id: string) {
    return this.request<any>(`/comments/${id}`);
  }

  async updateComment(id: string, data: { content: string }) {
    return this.request<any>(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteComment(id: string) {
    return this.request<any>(`/comments/${id}`, {
      method: 'DELETE'
    });
  }

  async regenerateComment(id: string) {
    return this.request<any>(`/comments/${id}/regenerate`, {
      method: 'POST'
    });
  }

  async favoriteComment(id: string) {
    return this.request<any>(`/comments/${id}/favorite`, {
      method: 'POST'
    });
  }

  async submitFeedback(id: string, feedback: number) {
    return this.request<any>(`/comments/${id}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback })
    });
  }

  async bulkGenerate(params: {
    class_id: string;
    student_ids: string[];
    style: string;
    length_type: string;
    comment_type: string;
    custom_prompts?: Record<string, string>;
  }) {
    return this.request<any>('/comments/bulk-generate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  async getBulkJobStatus(jobId: string) {
    return this.request<any>(`/comments/bulk-job/${jobId}`);
  }

  // Student & Class APIs
  async getClasses() {
    return this.request<any>('/classes');
  }

  async createClass(data: { name: string; grade?: string; academic_year?: string }) {
    return this.request<any>('/classes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateClass(id: string, data: Partial<{ name: string; grade: string; academic_year: string }>) {
    return this.request<any>(`/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteClass(id: string) {
    return this.request<any>(`/classes/${id}`, {
      method: 'DELETE'
    });
  }

  async getStudents(classId?: string) {
    const query = classId ? `?class_id=${classId}` : '';
    return this.request<any>(`/students${query}`);
  }

  async createStudent(data: {
    class_id: string;
    name: string;
    gender?: string;
    student_number?: string;
    notes?: string;
  }) {
    return this.request<any>('/students', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateStudent(id: string, data: Partial<{
    name: string;
    gender: string;
    student_number: string;
    notes: string;
  }>) {
    return this.request<any>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteStudent(id: string) {
    return this.request<any>(`/students/${id}`, {
      method: 'DELETE'
    });
  }

  async importStudents(classId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('class_id', classId);

    const url = `${this.baseUrl}/students/import`;
    const token = this.getToken();

    const response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new ApiError(error.error || 'Import failed', response.status, error.message);
    }

    return response.json();
  }

  // Subscription/Payment APIs
  async getSubscriptionStatus() {
    return this.request<any>('/subscription/status');
  }

  async createOrder(productType: string) {
    return this.request<any>('/subscription/create-order', {
      method: 'POST',
      body: JSON.stringify({ product_type: productType })
    });
  }

  async getOrders() {
    return this.request<any>('/subscription/orders');
  }

  // Admin APIs
  async getAdminStats() {
    return this.request<any>('/admin/stats');
  }

  async getAdminUsers(params?: { page?: number; limit?: number }) {
    const query = params 
      ? `?${new URLSearchParams(params as any).toString()}`
      : '';
    return this.request<any>(`/admin/users${query}`);
  }

  // Health Check
  async healthCheck() {
    return this.request<any>('/');
  }
}

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Singleton instance
const apiClient = new ApiClient();
export default apiClient;
export { ApiClient };
