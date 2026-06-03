import { useState, useEffect, type FC, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import SEO from '../components/SEO';
import { useToast } from '../components/Toast';
import RoleSelector from '../components/RoleSelector';
import { exportClassDataToCSV } from '../utils/dataExport';
import { api } from '../utils/apiClient';

interface Student {
  id: string;
  name: string;
  class_id: string;
}

interface Class {
  id: string;
  name: string;
  student_count: number;
}

interface BulkJob {
  id: string;
  total: number;
  completed: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  estimated_seconds?: number;
}

const COMMENT_TYPES = [
  { value: 'summary', label: '期末总结' },
  { value: 'encouragement', label: '日常鼓励' },
  { value: 'improvement', label: '改进建议' },
  { value: 'parent', label: '家长沟通' },
  { value: 'midterm', label: '期中反馈' },
  { value: 'single_subject', label: '单科评语' },
  { value: 'growth_report', label: '成长简报' }
];

const STYLES = [
  { value: 'gentle', label: '温和鼓励' },
  { value: 'formal', label: '正式严谨' },
  { value: 'humorous', label: '幽默亲切' }
];

const LENGTHS = [
  { value: 'concise', label: '精简版 (80-120字)' },
  { value: 'standard', label: '标准版 (200-300字)' },
  { value: 'detailed', label: '详细版 (400-500字)' }
];

const BulkGenerate: FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // 状态
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentJob, setCurrentJob] = useState<BulkJob | null>(null);
  const [results, setResults] = useState<any[]>([]);
  
  // 参数设置
  const [style, setStyle] = useState('gentle');
  const [lengthType, setLengthType] = useState('standard');
  const [commentType, setCommentType] = useState('summary');
  const [defaultRole, setDefaultRole] = useState<string | null>(null);
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [showCustomPrompts, setShowCustomPrompts] = useState(false);

  // 加载班级
  useEffect(() => {
    fetchClasses();
  }, []);

  // 当选择班级时加载学生
  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/api/classes');
      setClasses((response.data as any).classes || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  };

  const fetchStudents = async (classId: string) => {
    try {
      const response = await api.get(`/api/students?class_id=${classId}`);
      setStudents((response.data as any).students || []);
      setSelectedStudentIds(new Set(((response.data as any).students || []).map((s: Student) => s.id)));
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudentIds(newSet);
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(new Set(students.map(s => s.id)));
  };

  const deselectAllStudents = () => {
    setSelectedStudentIds(new Set());
  };

  const selectOnlyUngenerated = () => {
    // 简化：这里假设所有学生都未生成（实际应查询数据库）
    setSelectedStudentIds(new Set(students.map(s => s.id)));
  };

  const startBulkGeneration = async () => {
    setIsGenerating(true);
    try {
      const prompts: Record<string, string> = {};
      Object.entries(customPrompts).forEach(([id, prompt]) => {
        if (prompt.trim()) {
          prompts[id] = prompt;
        }
      });

      const response = await api.post('/api/comments/bulk-generate', {
        class_id: selectedClassId,
        student_ids: Array.from(selectedStudentIds),
        style,
        length_type: lengthType,
        comment_type: commentType,
        class_role: defaultRole,
        custom_prompts: Object.keys(prompts).length > 0 ? prompts : undefined
      });

      const job = response.data as any;
      setCurrentJob(job);

      pollProgress(job.id);
    } catch (error) {
      console.error('Bulk generation error:', error);
      toast.error(error instanceof Error ? error.message : '生成失败，请重试');
      setIsGenerating(false);
    }
  };

  const pollProgress = async (jobId: string) => {
    try {
      const response = await api.get(`/api/comments/bulk-job/${jobId}`);
      const job = response.data as any;
      setCurrentJob(job);

      if (job.status === 'processing') {
        setTimeout(() => pollProgress(jobId), 2000);
      } else if (job.status === 'completed') {
        setIsGenerating(false);
        setStep(4);
        loadResults(jobId);
      } else if (job.status === 'failed') {
        setIsGenerating(false);
        toast.error('批量生成失败，请重试');
      }
    } catch (error) {
      console.error('Poll progress error:', error);
      setIsGenerating(false);
    }
  };

  const loadResults = async (jobId: string) => {
    try {
      const response = await api.get(`/api/comments/bulk-job/${jobId}/results`);
      setResults((response.data as any).results || []);
    } catch (error) {
      console.error('Load results error:', error);
    }
  };

  const selectedStudents = students.filter(s => selectedStudentIds.has(s.id));
  const progress = currentJob ? Math.round((currentJob.completed / currentJob.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <SEO 
        title="批量生成"
        description="为全班学生批量生成个性化评语"
      />
      
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">⚡</span>
            <h1 className="text-3xl font-bold text-slate-900">批量生成</h1>
          </div>
          <Button variant="secondary" onClick={() => navigate('/')} size="sm">
            ← 返回首页
          </Button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          {['选择学生', '设置参数', '确认开始', '查看结果'].map((label, index) => (
            <Fragment key={label}>
              <div className={`flex flex-col items-center ${step > index + 1 ? 'text-blue-600' : step === index + 1 ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  step > index + 1 ? 'bg-blue-600' : step === index + 1 ? 'bg-blue-500' : 'bg-slate-300'
                }`}>
                  {step > index + 1 ? '✓' : index + 1}
                </div>
                <span className="mt-2 text-sm font-medium">{label}</span>
              </div>
              {index < 3 && (
                <div className={`flex-1 h-1 mx-3 rounded ${step > index + 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
              )}
            </Fragment>
          ))}
        </div>

        {/* Step 1: Select Students */}
        {step === 1 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
            <h2 className="text-xl font-bold text-slate-900">选择要生成评语的学生</h2>
            
            {/* Class Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">选择班级</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">请选择班级</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name} ({cls.student_count}人)</option>
                ))}
              </select>
            </div>

            {/* Selection Options */}
            {selectedClassId && (
              <>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="secondary" onClick={selectAllStudents}>
                    ☑ 全部 ({students.length}人)
                  </Button>
                  <Button size="sm" variant="secondary" onClick={deselectAllStudents}>
                    ☐ 取消全选
                  </Button>
                  <Button size="sm" variant="secondary" onClick={selectOnlyUngenerated}>
                    仅未生成的
                  </Button>
                </div>

                {/* Student List */}
                <div className="border border-slate-200 rounded-lg max-h-96 overflow-y-auto">
                  {students.map(student => (
                    <label key={student.id} className={`flex items-center p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 ${
                      selectedStudentIds.has(student.id) ? 'bg-blue-50' : ''
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.has(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="mr-3 w-4 h-4 text-blue-600"
                      />
                      <span className="font-medium">{student.name}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <span className="text-slate-600">
                    已选择 <strong>{selectedStudents.length}</strong> / {students.length} 名学生
                  </span>
                  <Button
                    onClick={() => selectedStudents.length > 0 && setStep(2)}
                    disabled={selectedStudents.length === 0}
                  >
                    下一步 →
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Configure Parameters */}
        {step === 2 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">统一设置参数</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">统一风格</label>
                <select
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {STYLES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">统一长度</label>
                <select
                  value={lengthType}
                  onChange={(e) => setLengthType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {LENGTHS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">评语类型</label>
                <select
                  value={commentType}
                  onChange={(e) => setCommentType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {COMMENT_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Default Role Selector */}
            <RoleSelector
              selectedRole={defaultRole}
              onSelect={setDefaultRole}
            />

            {/* Custom Prompts Toggle */}
            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={() => setShowCustomPrompts(!showCustomPrompts)}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {showCustomPrompts ? '▼' : '▶'} 为每位学生单独补充说明（选填）
              </button>
              
              {showCustomPrompts && (
                <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                  {selectedStudents.slice(0, 10).map(student => (
                    <div key={student.id}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {student.name}
                      </label>
                      <textarea
                        value={customPrompts[student.id] || ''}
                        onChange={(e) => setCustomPrompts({
                          ...customPrompts,
                          [student.id]: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        rows={2}
                        placeholder="如：数学课代表，期中考了98分..."
                      />
                    </div>
                  ))}
                  {selectedStudents.length > 10 && (
                    <p className="text-sm text-slate-500 italic">
                      仅显示前10名学生，其余将使用默认参数...
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← 上一步
              </Button>
              <Button onClick={() => setStep(3)}>
                预览并开始 →
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Confirm */}
        {step === 3 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">预览与确认</h2>
            
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold text-blue-900">生成配置摘要</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div><strong>班级:</strong> {classes.find(c => c.id === selectedClassId)?.name}</div>
                <div><strong>学生数:</strong> {selectedStudents.length} 人</div>
                <div><strong>风格:</strong> {STYLES.find(s => s.value === style)?.label}</div>
                <div><strong>长度:</strong> {LENGTHS.find(l => l.value === lengthType)?.label}</div>
                <div><strong>类型:</strong> {COMMENT_TYPES.find(t => t.value === commentType)?.label}</div>
                <div><strong>预计耗时:</strong> ~{Math.ceil(selectedStudents.length * 3 / 60)} 分钟</div>
                {defaultRole && <div><strong>班级职务:</strong> {defaultRole}</div>}
              </div>
            </div>

            {/* Sample Preview */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-3">批量预览 (前3名)</h3>
              <div className="space-y-2">
                {selectedStudents.slice(0, 3).map((student, idx) => (
                  <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium">{idx + 1}. {student.name}</span>
                    <span className="text-sm text-slate-500">待生成</span>
                  </div>
                ))}
                {selectedStudents.length > 3 && (
                  <p className="text-sm text-slate-500 text-center">
                    ... 其余 {selectedStudents.length - 3} 条
                  </p>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ 批量生成将消耗 {selectedStudents.length} 次额度，请确认您的套餐余额充足。
              </p>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => setStep(2)}>
                ← 上一步
              </Button>
              <Button
                onClick={startBulkGeneration}
                disabled={isGenerating}
                size="lg"
              >
                {isGenerating ? '准备中...' : `✨ 开始生成全部 ${selectedStudents.length} 条`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Progress & Results */}
        {(step === 4 || isGenerating) && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-6">
            <h2 className="text-xl font-bold text-slate-900">
              {isGenerating ? '正在生成...' : '生成完成'}
            </h2>

            {/* Progress Bar */}
            {isGenerating && currentJob && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">进度</span>
                  <span className="font-medium">{currentJob.completed} / {currentJob.total}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-slate-600">
                  正在生成: {currentJob.completed < selectedStudents.length 
                    ? `${selectedStudents[currentJob.completed]?.name || ''} 的评语...`
                    : '即将完成...'
                  }
                </p>
                {currentJob.estimated_seconds && (
                  <p className="text-xs text-slate-500">
                    已用时间: 约{Math.round(((currentJob.total - currentJob.completed) * 3) / 60)}分钟剩余
                  </p>
                )}
              </div>
            )}

            {/* Results List */}
            {!isGenerating && results.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">生成结果 ({results.length} 条)</h3>
                  <button
                    onClick={() => {
                      const rows: string[][] = [['学生姓名', '评语内容', '生成时间']];
                      results.forEach((r: any) => {
                        rows.push([r.student_name || '-', (r.content || '').replace(/,/g, '，'), r.created_at || '-']);
                      });
                      const csvContent = rows.map(r => r.join(',')).join('\n');
                      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(blob);
                      link.download = `批量评语_${new Date().toISOString().slice(0,10)}.csv`;
                      link.click();
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-medium transition-colors"
                  >
                    📤 导出全部评语
                  </button>
                </div>
                {results.map((result: any, idx: number) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-slate-900">{result.student_name}</span>
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                        ✓ 成功
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-3">{result.content}</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(result.content)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        📋 复制
                      </button>
                      <button
                        onClick={() => navigate(`/history`)}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        查看详情 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t border-slate-200">
              <Button variant="secondary" onClick={() => navigate('/students')}>
                返回班级管理
              </Button>
              <Button onClick={() => navigate('/history')}>
                查看历史记录 →
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkGenerate;
