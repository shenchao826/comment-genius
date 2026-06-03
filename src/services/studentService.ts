import apiClient from './api';

export interface Student {
  id: string;
  class_id: string;
  name: string;
  gender?: 'male' | 'female';
  student_number?: string;
  notes?: string;
  tags?: string[];
  comment_count?: number;
  created_at: string;
}

export interface Class {
  id: string;
  user_id: string;
  name: string;
  grade?: string;
  academic_year?: string;
  student_count: number;
  created_at: string;
}

const StudentService = {
  // Class operations
  async getClasses(): Promise<Class[]> {
    const result = await apiClient.getClasses();
    return result.classes || [];
  },

  async createClass(data: { name: string; grade?: string; academic_year?: string }): Promise<Class> {
    const result = await apiClient.createClass(data);
    if (result.error === 'Quota Exceeded') {
      throw new Error(result.message || '班级数量已达上限，请升级到专业版');
    }
    return result.class;
  },

  async updateClass(id: string, data: Partial<Class>): Promise<Class> {
    return apiClient.updateClass(id, data);
  },

  async deleteClass(id: string): Promise<void> {
    await apiClient.deleteClass(id);
  },

  // Student operations
  async getStudents(classId?: string): Promise<Student[]> {
    const result = await apiClient.getStudents(classId);
    return result.students || [];
  },

  async createStudent(data: {
    class_id: string;
    name: string;
    gender?: string;
    student_number?: string;
    notes?: string;
  }): Promise<Student> {
    const result = await apiClient.createStudent(data);
    if (result.error === 'Quota Exceeded') {
      throw new Error(result.message || '学生数量已达上限，请升级到专业版');
    }
    return result.student;
  },

  async updateStudent(
    id: string,
    data: Partial<Pick<Student, 'name' | 'gender' | 'student_number' | 'notes'>>
  ): Promise<Student> {
    return apiClient.updateStudent(id, data);
  },

  async deleteStudent(id: string): Promise<void> {
    await apiClient.deleteStudent(id);
  },

  async importStudents(classId: string, file: File): Promise<{
    imported_count: number;
    failed_count: number;
    errors: string[];
  }> {
    const result = await apiClient.importStudents(classId, file);
    return {
      imported_count: result.imported_count,
      failed_count: result.failed_count,
      errors: result.errors || []
    };
  },

  async exportStudents(classId?: string): Promise<Blob> {
    const url = `${apiClient['baseUrl']}/students/export${classId ? `?class_id=${classId}` : ''}`;
    const token = apiClient.getToken();

    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });

    if (!response.ok) {
      throw new Error('导出失败');
    }

    return response.blob();
  },

  // Helper: Validate Excel/CSV format
  validateImportFile(file: File): { valid: boolean; error?: string } {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'text/csv', // .csv
      'application/vnd.ms-excel' // .xls
    ];

    if (!validTypes.includes(file.type)) {
      return { valid: false, error: '仅支持 .xlsx 或 .csv 格式文件' };
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return { valid: false, error: '文件大小不能超过5MB' };
    }

    return { valid: true };
  },

  // Helper: Format gender display
  formatGender(gender?: string): string {
    const genderMap: Record<string, string> = {
      male: '男',
      female: '女',
      other: '其他'
    };
    return gender ? (genderMap[gender] || gender) : '-';
  }
};

export default StudentService;
