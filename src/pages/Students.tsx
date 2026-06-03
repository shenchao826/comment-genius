import { useState, useEffect, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import SEO from '../components/SEO';
import { useToast } from '../components/Toast';
import { CLASS_ROLES, ROLE_CATEGORIES, getRoleById } from '../data/class-roles';
import ExamAnalyzer from '../components/ExamAnalyzer';
import DataTimeline, { buildTimelineFromData } from '../components/DataTimeline';
import { api, uploadFile } from '../utils/apiClient';

interface Class {
  id: string;
  name: string;
  grade?: string;
  academic_year?: string;
  student_count: number;
  created_at: string;
}

interface Student {
  id: string;
  class_id: string;
  name: string;
  gender?: string;
  student_number?: string;
  class_role?: string;
  notes?: string;
  tags?: string[];
  comment_count?: number;
  created_at: string;
}

const Students: FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // 状态管理
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentExams, setStudentExams] = useState<Record<string, any[]>>({});
  const [studentConversations, setStudentConversations] = useState<Record<string, any[]>>({});
  const [studentHomeVisits, setStudentHomeVisits] = useState<Record<string, any[]>>({});
  const [studentBehaviors, setStudentBehaviors] = useState<Record<string, any[]>>({});
  const [showDataModal, setShowDataModal] = useState<{ studentId: string; tab: 'exam' | 'conversation' | 'homevisit' | 'behavior' } | null>(null);
  const [dataModalTab, setDataModalTab] = useState<'exam' | 'conversation' | 'homevisit' | 'behavior'>('exam');

  useEffect(() => {
    if (showDataModal) {
      setDataModalTab(showDataModal.tab);
    }
  }, [showDataModal]);
  
  // 表单状态
  const [studentForm, setStudentForm] = useState({
    name: '',
    gender: '',
    student_number: '',
    class_role: '',
    notes: ''
  });
  
  const [classForm, setClassForm] = useState({
    name: '',
    grade: '',
    academic_year: ''
  });

  // 加载班级列表
  useEffect(() => {
    fetchClasses();
  }, []);

  // 当选择班级时加载学生
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (students.length > 0) {
      students.forEach(s => {
        fetchStudentExams(s.id, s.name);
        fetchStudentConversations(s.id, s.name);
        fetchStudentHomeVisits(s.id, s.name);
        fetchStudentBehaviors(s.id, s.name);
      });
    }
  }, [students.length]);

  const fetchClasses = async () => {
    try {
      const res = await api.get<{ classes: Class[] }>('/api/classes');
      setClasses(res.data.classes || []);
      if (res.data.classes?.length > 0 && !selectedClassId) {
        setSelectedClassId(res.data.classes[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async (classId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get<{ students: Student[] }>(`/api/students?class_id=${classId}`);
      setStudents(res.data.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 创建班级
  const handleCreateClass = async () => {
    try {
      await api.post('/api/classes', classForm);
      setShowAddClassModal(false);
      setClassForm({ name: '', grade: '', academic_year: '' });
      fetchClasses();
      toast.success('班级创建成功！');
    } catch (error: any) {
      console.error('Failed to create class:', error);
      toast.error(error.message || '创建失败，请重试');
    }
  };

  // 添加/编辑学生
  const handleSaveStudent = async () => {
    try {
      if (editingStudent) {
        await api.put(`/api/students/${editingStudent.id}`, {
          ...studentForm,
          class_id: selectedClassId
        });
      } else {
        await api.post('/api/students', {
          ...studentForm,
          class_id: selectedClassId
        });
      }
      setShowAddStudentModal(false);
      setEditingStudent(null);
      setStudentForm({ name: '', gender: '', student_number: '', class_role: '', notes: '' });
      fetchStudents(selectedClassId);
      toast.success(editingStudent ? '学生信息更新成功！' : '学生添加成功！');
    } catch (error: any) {
      console.error('Failed to save student:', error);
      toast.error(error.message || '操作失败，请重试');
    }
  };

  // 删除学生
  const handleDeleteStudent = async (studentId: string) => {
    if (!confirm('确定要删除这个学生吗？')) return;

    try {
      await api.delete(`/api/students/${studentId}`);
      fetchStudents(selectedClassId);
      toast.success('删除成功');
    } catch (error) {
      console.error('Failed to delete student:', error);
      toast.error('删除失败，请重试');
    }
  };

  // Excel 导入
  const handleExcelImport = async (file: File) => {
    try {
      const res = await uploadFile('/api/students/import', file, 'file', { class_id: selectedClassId });
      setShowImportModal(false);
      fetchStudents(selectedClassId);
      toast.success(`成功导入 ${(res.data as any).imported_count} 名学生`);
    } catch (error: any) {
      console.error('Failed to import students:', error);
      toast.error(error.message || '导入失败，请重试');
    }
  };

  const fetchStudentExams = async (studentId: string, _studentName: string) => {
    try {
      const res = await api.get<{ data: any[] }>(`/api/exams?student_id=${studentId}`);
      setStudentExams(prev => ({ ...prev, [studentId]: res.data.data || [] }));
    } catch { /* ignore */ }
  };

  const fetchStudentConversations = async (studentId: string, _studentName: string) => {
    try {
      const res = await api.get<{ data: any[] }>(`/api/conversations?student_id=${studentId}`);
      setStudentConversations(prev => ({ ...prev, [studentId]: res.data.data || [] }));
    } catch { /* ignore */ }
  };

  const fetchStudentHomeVisits = async (studentId: string, _studentName: string) => {
    try {
      const res = await api.get<{ data: any[] }>(`/api/home-visits?student_id=${studentId}`);
      setStudentHomeVisits(prev => ({ ...prev, [studentId]: res.data.data || [] }));
    } catch { /* ignore */ }
  };

  const fetchStudentBehaviors = async (studentId: string, _studentName: string) => {
    try {
      const res = await api.get<{ data: any[] }>(`/api/behaviors?student_id=${studentId}`);
      setStudentBehaviors(prev => ({ ...prev, [studentId]: res.data.data || [] }));
    } catch { /* ignore */ }
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      name: student.name,
      gender: student.gender || '',
      student_number: student.student_number || '',
      class_role: student.class_role || '',
      notes: student.notes || ''
    });
    setShowAddStudentModal(true);
  };

  const currentClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <SEO 
        title="班级管理"
        description="管理您的班级和学生信息，支持批量导入"
      />
      
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📚</span>
            <h1 className="text-3xl font-bold text-slate-900">我的管理</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/dashboard')} size="sm">📊 数据看板</Button>
            <Button variant="secondary" onClick={() => navigate('/')} size="sm">← 返回首页</Button>
          </div>
        </div>

        {/* Class Tabs */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">选择班级</h2>
            <Button onClick={() => setShowAddClassModal(true)} size="sm">
              + 新建班级
            </Button>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2">
            {classes.map((cls) => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
                  selectedClassId === cls.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <div className="font-medium">{cls.name}</div>
                <div className="text-xs opacity-80">{cls.student_count}人</div>
              </button>
            ))}
            {classes.length === 0 && (
              <p className="text-slate-500 text-sm">暂无班级，请先创建</p>
            )}
          </div>
        </div>

        {/* Action Bar */}
        {selectedClassId && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-slate-800">
                  {currentClass?.name}
                  <span className="ml-2 text-sm font-normal text-slate-500">
                    ({students.length} 名学生)
                  </span>
                </h3>
              </div>
              
              <div className="flex gap-2">
                <Button onClick={() => { setEditingStudent(null); setStudentForm({ name: '', gender: '', student_number: '', class_role: '', notes: '' }); setShowAddStudentModal(true); }} size="sm">
                  + 添加学生
                </Button>
                <Button variant="secondary" onClick={() => setShowImportModal(true)} size="sm">
                  📥 Excel导入
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const selectedStudents = students.filter(_s => window.confirm(`确定导出 ${currentClass?.name} 学生名单吗？`));
                    if (selectedStudents.length > 0) {
                      exportToExcel(selectedStudents, currentClass?.name || '学生名单');
                    }
                  }}
                  size="sm"
                >
                  📤 导出
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Students Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white rounded-lg border border-slate-200 animate-pulse" />
            ))}
          </div>
        ) : !selectedClassId ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">📚</div>
            <p className="text-slate-500 text-lg">请选择或创建一个班级</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">👨‍🎓</div>
            <p className="text-slate-500 text-lg">暂无学生</p>
            <p className="text-sm text-slate-400">添加学生或从Excel导入</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => setShowAddStudentModal(true)}>手动添加</Button>
              <Button variant="secondary" onClick={() => setShowImportModal(true)}>Excel导入</Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      序号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      姓名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      性别
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      学号
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      职务
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      数据
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      备注
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      评语数
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {students.map((student, index) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {student.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {student.gender === 'male' ? '男' : student.gender === 'female' ? '女' : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {student.student_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {student.class_role ? (() => {
                          const role = getRoleById(student.class_role!);
                          return role ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                              {role.icon} {role.name}
                            </span>
                          ) : '-';
                        })() : '-'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {studentExams[student.id]?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDataModal({ studentId: student.id, tab: 'exam' })}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                            >
                              📊 {studentExams[student.id].length}
                            </button>
                          )}
                            {studentConversations[student.id]?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDataModal({ studentId: student.id, tab: 'conversation' })}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors"
                            >
                              💬 {studentConversations[student.id].length}
                            </button>
                          )}
                          {studentHomeVisits[student.id]?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDataModal({ studentId: student.id, tab: 'homevisit' })}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                            >
                              🏠 {studentHomeVisits[student.id].length}
                            </button>
                          )}
                          {studentBehaviors[student.id]?.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setShowDataModal({ studentId: student.id, tab: 'behavior' })}
                              className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                            >
                              ⭐ {studentBehaviors[student.id].length}
                            </button>
                          )}
                          {!studentExams[student.id]?.length && !studentConversations[student.id]?.length && !studentHomeVisits[student.id]?.length && !studentBehaviors[student.id]?.length && (
                            <span className="text-gray-300 text-xs">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                        {student.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                          {student.comment_count || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <button
                          onClick={() => openEditModal(student)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          ✏️ 编辑
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ 删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Info */}
            <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-600">
                显示 1-{students.length} / 共 {students.length} 人
              </p>
            </div>
          </div>
        )}

        {/* Add/Edit Student Modal */}
        {showAddStudentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingStudent ? '编辑学生' : '添加学生'}
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({...studentForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="请输入学生姓名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    性别
                  </label>
                  <select
                    value={studentForm.gender}
                    onChange={(e) => setStudentForm({...studentForm, gender: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">请选择</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    学号
                  </label>
                  <input
                    type="text"
                    value={studentForm.student_number}
                    onChange={(e) => setStudentForm({...studentForm, student_number: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="选填"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    班级职务
                  </label>
                  <select
                    value={studentForm.class_role}
                    onChange={(e) => setStudentForm({...studentForm, class_role: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">无职务</option>
                    {Object.entries(ROLE_CATEGORIES).map(([key, category]) => {
                      if (key === 'general') return null;
                      const roles = CLASS_ROLES.filter(r => r.category === key);
                      if (roles.length === 0) return null;
                      return (
                        <optgroup key={key} label={`${category.icon} ${category.label}`}>
                          {roles.map(role => (
                            <option key={role.id} value={role.id}>
                              {role.icon} {role.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    备注/特点标签
                  </label>
                  <textarea
                    value={studentForm.notes}
                    onChange={(e) => setStudentForm({...studentForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={3}
                    placeholder="如：学习认真、数学课代表..."
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowAddStudentModal(false);
                    setEditingStudent(null);
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleSaveStudent}
                  className="flex-1"
                  disabled={!studentForm.name.trim()}
                >
                  {editingStudent ? '更新' : '添加'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Add Class Modal */}
        {showAddClassModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-xl font-bold text-slate-900">新建班级</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    班级名称 *
                  </label>
                  <input
                    type="text"
                    value={classForm.name}
                    onChange={(e) => setClassForm({...classForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="如：三年二班"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    年级
                  </label>
                  <input
                    type="text"
                    value={classForm.grade}
                    onChange={(e) => setClassForm({...classForm, grade: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="如：三年级"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    学年
                  </label>
                  <input
                    type="text"
                    value={classForm.academic_year}
                    onChange={(e) => setClassForm({...classForm, academic_year: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="如：2025-2026"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowAddClassModal(false)}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreateClass}
                  className="flex-1"
                  disabled={!classForm.name.trim()}
                >
                  创建
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Excel Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
              <h3 className="text-xl font-bold text-slate-900">Excel 导入学生</h3>
              
              <div className="space-y-3">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-800 font-medium mb-2">📋 Excel 格式要求：</p>
                  <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    <li>第一行为表头：姓名,性别,备注</li>
                    <li>支持 .xlsx 和 .csv 格式</li>
                    <li>姓名为必填项</li>
                  </ul>
                </div>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) handleExcelImport(file);
                  }}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
                >
                  <input
                    type="file"
                    accept=".xlsx,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExcelImport(file);
                    }}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <div className="text-4xl mb-2">📁</div>
                    <p className="text-slate-700 font-medium">点击或拖拽文件到此处</p>
                    <p className="text-sm text-slate-500 mt-1">支持 .xlsx, .csv 格式</p>
                  </label>
                </div>
              </div>
              
              <Button
                variant="secondary"
                onClick={() => setShowImportModal(false)}
                className="w-full"
              >
                取消
              </Button>
            </div>
          </div>
        )}

        {showDataModal && (() => {
          const student = students.find(s => s.id === showDataModal.studentId);
          const exams = studentExams[showDataModal.studentId] || [];
          const conversations = studentConversations[showDataModal.studentId] || [];
          const homeVisits = studentHomeVisits[showDataModal.studentId] || [];
          const behaviors = studentBehaviors[showDataModal.studentId] || [];

          const typeLabels: Record<string, string> = {
            daily: '日常沟通', discipline: '纪律谈话', praise: '表扬鼓励',
            psychological: '心理疏导', goal: '目标规划',
          };
          const visitLabels: Record<string, string> = {
            in_person: '上门家访', phone: '电话家访', video: '视频家访', school_meeting: '到校面谈',
          };
          const behaviorLabels: Record<string, string> = {
            praise: '表扬', warning: '提醒', punishment: '惩罚',
          };
          const categoryLabels: Record<string, string> = {
            classroom: '课堂表现', homework: '作业情况', activity: '活动参与',
            discipline: '纪律表现', other: '其他',
          };

          const renderTabContent = () => {
            if (dataModalTab === 'exam') {
              return exams.length > 0 ? (
                <>
                  <ExamAnalyzer exams={exams} />
                  <div className="mt-4">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead><tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">考试</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">科目</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">分数</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">排名</th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {exams.map((exam: any, i: number) => (
                          <tr key={i} className="text-sm">
                            <td className="px-3 py-2">{exam.exam_name || '-'}</td>
                            <td className="px-3 py-2">{exam.subject || '-'}</td>
                            <td className="px-3 py-2 font-medium">{exam.score}/{exam.full_score || 100}</td>
                            <td className="px-3 py-2">{exam.class_rank ? `第${exam.class_rank}名` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400"><p className="text-4xl mb-2">📋</p><p>暂无成绩记录</p></div>
              );
            }
            if (dataModalTab === 'conversation') {
              return conversations.length > 0 ? (
                <div className="space-y-3">
                  {conversations.map((c: any, i: number) => (
                    <div key={i} className="border border-teal-200 rounded-lg p-3 bg-teal-50/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 font-medium">
                          {typeLabels[c.conversation_type] || c.conversation_type}
                        </span>
                        <span className="text-xs text-gray-400">{c.conversation_date || '-'}</span>
                      </div>
                      <p className="text-sm text-gray-700">{c.content}</p>
                      {c.student_reaction && <p className="text-xs text-gray-500 mt-1">学生反应：{c.student_reaction}</p>}
                      {c.follow_up && <p className="text-xs text-blue-600 mt-1">后续：{c.follow_up}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400"><p className="text-4xl mb-2">💬</p><p>暂无谈话记录</p></div>
              );
            }
            if (dataModalTab === 'homevisit') {
              return homeVisits.length > 0 ? (
                <div className="space-y-3">
                  {homeVisits.map((v: any, i: number) => (
                    <div key={i} className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                          {visitLabels[v.visit_type] || v.visit_type}
                        </span>
                        <span className="text-xs text-gray-400">{v.visit_date || '-'}</span>
                      </div>
                      <p className="text-sm text-gray-700">{v.visit_purpose || '-'}</p>
                      {v.key_topics && <p className="text-xs text-gray-500 mt-1">议题：{v.key_topics}</p>}
                      {v.consensus && <p className="text-xs text-green-600 mt-1">共识：{v.consensus}</p>}
                      {v.follow_plan && <p className="text-xs text-blue-600 mt-1">跟进：{v.follow_plan}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400"><p className="text-4xl mb-2">🏠</p><p>暂无家访记录</p></div>
              );
            }
            if (dataModalTab === 'behavior') {
              const totalPoints = behaviors.reduce((sum: number, b: any) => sum + (b.points || 0), 0);
              return behaviors.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-700">共 {behaviors.length} 条记录</span>
                    <span className={`text-sm font-bold ${totalPoints >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      积分：{totalPoints > 0 ? '+' : ''}{totalPoints}
                    </span>
                  </div>
                  <DataTimeline
                    items={buildTimelineFromData([], [], [], behaviors)}
                    compact={false}
                  />
                  <div className="space-y-2">
                    {behaviors.map((b: any, i: number) => {
                      const typeColor = b.behavior_type === 'praise' ? 'emerald' : b.behavior_type === 'warning' ? 'amber' : 'red';
                      const typeIcon = b.behavior_type === 'praise' ? '🌟' : b.behavior_type === 'warning' ? '⚡' : '🔴';
                      return (
                        <div key={i} className={`border border-${typeColor}-200 rounded-lg p-3 bg-${typeColor}-50/50`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full bg-${typeColor}-100 text-${typeColor}-700 font-medium`}>
                              {typeIcon} {behaviorLabels[b.behavior_type] || b.behavior_type}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {categoryLabels[b.behavior_category] || b.behavior_category}
                            </span>
                            {b.points !== undefined && (
                              <span className={`text-xs font-bold ${b.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {b.points > 0 ? '+' : ''}{b.points}
                              </span>
                            )}
                            <span className="text-xs text-gray-400 ml-auto">{b.record_date || '-'}</span>
                          </div>
                          {b.behavior_tag && <p className="text-sm font-medium text-gray-800">{b.behavior_tag}</p>}
                          {b.description && <p className="text-xs text-gray-500 mt-1">{b.description}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400"><p className="text-4xl mb-2">⭐</p><p>暂无行为记录</p></div>
              );
            }
            return null;
          };

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDataModal(null)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">📋 学生数据 — {student?.name}</h3>
                    <div className="flex items-center gap-2">
                      {(exams.length > 0 || conversations.length > 0 || homeVisits.length > 0 || behaviors.length > 0) && (
                        <button
                          type="button"
                          onClick={() => {
                            // @ts-expect-error require is used for dynamic import
                            const { exportStudentDetailToCSV } = require('../utils/dataExport') as any;
                            exportStudentDetailToCSV(
                              student?.name || '学生',
                              exams, conversations, homeVisits, behaviors
                            );
                          }}
                          className="text-xs px-3 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                        >
                          📤 导出
                        </button>
                      )}
                      <button type="button" onClick={() => setShowDataModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                    </div>
                  </div>

                  <div className="flex gap-1 mb-4 border-b border-gray-200">
                    {[
                      { key: 'exam' as const, label: `📊 成绩 (${exams.length})` },
                      { key: 'conversation' as const, label: `💬 谈话 (${conversations.length})` },
                      { key: 'homevisit' as const, label: `🏠 家访 (${homeVisits.length})` },
                      { key: 'behavior' as const, label: `⭐ 行为 (${behaviors.length})` },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setDataModalTab(tab.key)}
                        className={`px-4 py-2 text-sm font-medium transition-colors ${
                          dataModalTab === tab.key
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {renderTabContent()}
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// 简单的 Excel 导出函数（实际项目中应使用 xlsx 库）
function exportToExcel(students: Student[], className: string) {
  const csvContent = [
    ['序号', '姓名', '性别', '学号', '职务', '备注'],
    ...students.map((s, i) => [
      i + 1,
      s.name,
      s.gender === 'male' ? '男' : s.gender === 'female' ? '女' : '',
      s.student_number || '',
      s.class_role ? getRoleById(s.class_role)?.name || '' : '',
      s.notes || ''
    ])
  ].map(row => row.join(',')).join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${className}_学生名单.csv`;
  link.click();
}

export default Students;
