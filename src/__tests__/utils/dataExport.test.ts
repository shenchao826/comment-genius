import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportClassDataToCSV, exportStudentDetailToCSV } from '../../utils/dataExport';

let capturedBlob: Blob | null = null;

function getBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsText(blob);
  });
}

async function readCaptured(): Promise<string> {
  if (!capturedBlob) throw new Error('No blob captured');
  return getBlobText(capturedBlob);
}

describe('dataExport utilities', () => {
  let mockLink: { href: string; download: string; click: () => void };

  beforeEach(() => {
    capturedBlob = null;
    mockLink = { href: '', download: '', click: vi.fn() };
    globalThis.document.createElement = vi.fn().mockReturnValue(mockLink) as any;
    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:url';
    });
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  describe('exportClassDataToCSV', () => {
    it('should generate CSV with header by default', () => {
      const students = [{ id: 's1', name: '张三', gender: 'male' }];
      exportClassDataToCSV(students, {}, {}, {}, {});

      expect(mockLink.download).toContain('班级数据看板');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should include student data in blob content', async () => {
      const students = [
        { id: 's1', name: '张三', gender: 'male' },
        { id: 's2', name: '李四', gender: 'female' },
      ];
      const exams = { s1: [{ score: 90 }] };
      const conversations = { s2: [{ content: 'hello' }] };

      exportClassDataToCSV(students, exams, conversations, {}, {});
      const text = await readCaptured();
      expect(text).toContain('张三');
      expect(text).toContain('李四');
    });

    it('should calculate data coverage correctly', async () => {
      const students = [{ id: 's1', name: '王五' }];
      const exams = { s1: [{}] };
      const behaviors = { s1: [{}] };

      exportClassDataToCSV(students, exams, {}, {}, behaviors);
      const text = await readCaptured();
      expect(text).toContain('2/4');
    });

    it('should handle empty data gracefully', () => {
      exportClassDataToCSV([], {}, {}, {}, {});
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should use custom filename when provided', () => {
      const students = [{ id: 's1', name: '张三' }];
      exportClassDataToCSV(students, {}, {}, {}, {}, { filename: '自定义.csv' });
      expect(mockLink.download).toBe('自定义.csv');
    });

    it('should skip header when option set to false', async () => {
      const students = [{ id: 's1', name: '张三' }];
      exportClassDataToCSV(students, {}, {}, {}, {}, { includeHeader: false });
      const text = await readCaptured();
      expect(text).not.toContain('姓名');
    });

    it('should calculate behavior points correctly', async () => {
      const students = [{ id: 's1', name: '赵六' }];
      const behaviors = { s1: [{ points: 3 }, { points: -1 }, { points: 5 }] };

      exportClassDataToCSV(students, {}, {}, {}, behaviors);
      const text = await readCaptured();
      expect(text).toContain(',7,');
    });

    it('should map gender correctly', async () => {
      const students = [
        { id: 's1', name: '男同学', gender: 'male' },
        { id: 's2', name: '女同学', gender: 'female' },
        { id: 's3', name: '未知', gender: undefined },
      ];
      exportClassDataToCSV(students, {}, {}, {}, {});
      const text = await readCaptured();
      expect(text).toContain('男');
      expect(text).toContain('女');
      expect(text).toContain('-');
    });
  });

  describe('exportStudentDetailToCSV', () => {
    it('should generate detailed report with student name in title', async () => {
      exportStudentDetailToCSV('张三', [], [], [], []);
      const text = await readCaptured();
      expect(text).toContain('张三');
    });

    it('should set filename with student name', () => {
      exportStudentDetailToCSV('学生A', [], [], [], []);
      expect(mockLink.download).toContain('学生A');
    });

    it('should export exam records with correct format', async () => {
      const exams = [
        { exam_name: '期中考试', subject: '数学', score: 92, full_score: 100, class_rank: 3, exam_date: '2026-03-15' },
      ];

      exportStudentDetailToCSV('学生B', exams, [], [], []);
      const text = await readCaptured();
      expect(text).toContain('成绩记录');
      expect(text).toContain('期中考试');
      expect(text).toContain('数学');
      expect(text).toContain('92');
      expect(text).toContain('第3名');
    });

    it('should show no-exam message when no exams', async () => {
      exportStudentDetailToCSV('学生C', [], [], [], []);
      const text = await readCaptured();
      expect(text).toContain('暂无成绩记录');
    });

    it('should export conversation records with type labels', async () => {
      const conversations = [
        { conversation_type: 'praise', content: '今天表现很好', student_reaction: '开心', conversation_date: '2026-04-01' },
      ];

      exportStudentDetailToCSV('学生D', [], conversations, [], []);
      const text = await readCaptured();
      expect(text).toContain('谈话记录');
      expect(text).toContain('表扬鼓励');
      expect(text).toContain('今天表现很好');
    });

    it('should export home visit records with type labels', async () => {
      const homeVisits = [
        { visit_type: 'in_person', visit_purpose: '了解家庭情况', consensus: '加强沟通', visit_date: '2026-05-01' },
      ];

      exportStudentDetailToCSV('学生E', [], [], homeVisits, []);
      const text = await readCaptured();
      expect(text).toContain('家访记录');
      expect(text).toContain('上门家访');
      expect(text).toContain('了解家庭情况');
    });

    it('should export behavior records with points and total', async () => {
      const behaviors = [
        { behavior_type: 'praise', behavior_category: 'classroom', behavior_tag: '积极发言', description: '课堂活跃', points: 1, record_date: '2026-06-01' },
        { behavior_type: 'warning', behavior_category: 'homework', behavior_tag: '作业迟交', points: -1, record_date: '2026-06-02' },
      ];

      exportStudentDetailToCSV('学生F', [], [], [], behaviors);
      const text = await readCaptured();
      expect(text).toContain('行为记录');
      expect(text).toContain('表扬');
      expect(text).toContain('课堂表现');
      expect(text).toContain('积极发言');
      expect(text).toContain(',1,');
      expect(text).toContain('-1');
      expect(text).toContain('积分合计：+0');
    });

    it('should show no-behavior message when no behaviors', async () => {
      exportStudentDetailToCSV('学生G', [], [], [], []);
      const text = await readCaptured();
      expect(text).toContain('暂无行为记录');
    });

    it('should use custom filename when provided', () => {
      exportStudentDetailToCSV('学生H', [], [], [], [], { filename: 'report.csv' });
      expect(mockLink.download).toBe('report.csv');
    });
  });
});
