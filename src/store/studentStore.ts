import { create } from 'zustand';
import StudentService from '../services/studentService';

type GenderType = 'male' | 'female';
type StudentGender = GenderType | undefined;

interface Student {
  id: string;
  class_id: string;
  name: string;
  gender?: StudentGender;
  student_number?: string;
  notes?: string;
  comment_count?: number;
}

interface Class {
  id: string;
  name: string;
  grade?: string;
  academic_year?: string;
  student_count: number;
}

interface StudentState {
  classes: Class[];
  students: Student[];
  selectedClassId: string | null;
  isLoading: boolean;
  error: string | null;

  // Class actions
  loadClasses: () => Promise<void>;
  selectClass: (classId: string) => void;
  createClass: (data: { name: string; grade?: string; academic_year?: string }) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;

  // Student actions
  loadStudents: (classId?: string) => Promise<void>;
  addStudent: (data: {
    class_id: string;
    name: string;
    gender?: string;
    student_number?: string;
    notes?: string;
  }) => Promise<void>;
  updateStudent: (id: string, data: Partial<Student>) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;

  // Utility
  getSelectedClass: () => Class | undefined;
  getStudentsByClass: (classId: string) => Student[];
  clearError: () => void;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  classes: [],
  students: [],
  selectedClassId: null,
  isLoading: false,
  error: null,

  loadClasses: async () => {
    set({ isLoading: true, error: null });
    try {
      const classes = await StudentService.getClasses();
      set({ 
        classes, 
        isLoading: false,
        selectedClassId: classes[0]?.id || null
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '加载班级列表失败'
      });
    }
  },

  selectClass: (classId) => {
    set({ selectedClassId: classId });
    get().loadStudents(classId);
  },

  createClass: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newClass = await StudentService.createClass(data);
      set((state) => ({
        classes: [...state.classes, newClass],
        selectedClassId: newClass.id,
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '创建班级失败'
      });
      throw error;
    }
  },

  deleteClass: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await StudentService.deleteClass(id);
      set((state) => {
        const filteredClasses = state.classes.filter(c => c.id !== id);
        return {
          classes: filteredClasses,
          selectedClassId: state.selectedClassId === id 
            ? (filteredClasses[0]?.id || null)
            : state.selectedClassId,
          students: [],
          isLoading: false
        };
      });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '删除班级失败'
      });
      throw error;
    }
  },

  loadStudents: async (classId) => {
    const targetClassId = classId || get().selectedClassId;
    if (!targetClassId) return;

    set({ isLoading: true, error: null });
    try {
      const students = await StudentService.getStudents(targetClassId);
      set({ students, isLoading: false });
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '加载学生列表失败'
      });
    }
  },

  addStudent: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const newStudent = await StudentService.createStudent(data);
      set((state) => ({
        students: [...state.students, newStudent],
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '添加学生失败'
      });
      throw error;
    }
  },

  updateStudent: async (id: string, data: Partial<Pick<Student, 'name' | 'gender' | 'student_number' | 'notes'>>) => {
    set({ isLoading: true, error: null });
    try {
      const updatedStudent = await StudentService.updateStudent(id, data);
      set((state) => ({
        students: state.students.map(s => 
          s.id === id ? updatedStudent : s
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '更新学生信息失败'
      });
      throw error;
    }
  },

  removeStudent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await StudentService.deleteStudent(id);
      set((state) => ({
        students: state.students.filter(s => s.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ 
        isLoading: false, 
        error: error.message || '删除学生失败'
      });
      throw error;
    }
  },

  getSelectedClass: () => {
    const { classes, selectedClassId } = get();
    return classes.find(c => c.id === selectedClassId);
  },

  getStudentsByClass: (classId) => {
    const { students } = get();
    return students.filter(s => s.class_id === classId);
  },

  clearError: () => set({ error: null })
}));
