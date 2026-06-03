import { useState, useRef, useCallback, useMemo } from 'react';
import { clsx } from 'clsx';
import { getErrorMessage } from '../utils/errorHandling';
import { api, uploadFile } from '../utils/apiClient';
import * as XLSX from 'xlsx';

interface ExamUploaderProps {
  studentId: string;
  studentName: string;
  onSaveComplete?: (count: number) => void;
}

interface ExamRecord {
  id: string;
  examName: string;
  subject: string;
  score: number | null;
  fullScore: number;
  classAvg: number | null;
  rank: number | null;
  examDate: string;
  isValid: boolean;
  errors: string[];
}

type TabMode = 'upload' | 'manual' | 'ocr';

const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
const IMAGE_EXTENSIONS = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const COLUMN_MAPPINGS: Record<string, keyof Pick<ExamRecord, 'examName' | 'subject' | 'score' | 'fullScore' | 'classAvg' | 'rank' | 'examDate'>> = {
  '考试名称': 'examName', '考试': 'examName', 'exam': 'examName', 'examname': 'examName',
  '考试科目': 'subject', '科目': 'subject', '学科': 'subject', '课程': 'subject', 'subject': 'subject',
  '分数': 'score', '成绩': 'score', '得分': 'score', '得分/分': 'score', 'score': 'score',
  '满分': 'fullScore', '总分': 'fullScore', '满分值': 'fullScore', 'fullscore': 'fullScore', 'full_score': 'fullScore',
  '班级平均分': 'classAvg', '平均分': 'classAvg', '班均分': 'classAvg', '平均': 'classAvg', 'avg': 'classAvg', 'average': 'classAvg',
  '排名': 'rank', '名次': 'rank', '班级排名': 'rank', 'rank': 'rank',
  '考试日期': 'examDate', '日期': 'examDate', '考试时间': 'examDate', 'date': 'examDate', 'examdate': 'examDate',
};

function generateId(): string {
  return `exam_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeColumnName(raw: unknown): string {
  if (raw == null) return '';
  const str = String(raw).trim();
  return str.replace(/\s+/g, '').toLowerCase();
}

function mapHeaders(headers: string[]): Map<keyof ExamRecord, number> {
  const mapping = new Map<keyof ExamRecord, number>();
  headers.forEach((h, idx) => {
    const norm = normalizeColumnName(h);
    if (COLUMN_MAPPINGS[norm]) {
      mapping.set(COLUMN_MAPPINGS[norm], idx);
    }
  });
  return mapping;
}

function parseCellValue(val: unknown): number | null {
  if (val == null || val === '') return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseDateValue(val: unknown): string {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return s.slice(0, 10);
  const d = new Date(val as string);
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function validateRecord(rec: ExamRecord): ExamRecord {
  const errors: string[] = [];
  if (!rec.examName.trim()) errors.push('考试名称不能为空');
  if (!rec.subject.trim()) errors.push('科目不能为空');
  if (rec.score !== null) {
    if (rec.score < 0) errors.push('分数不能为负数');
    if (rec.fullScore > 0 && rec.score > rec.fullScore) errors.push(`分数(${rec.score})超过满分(${rec.fullScore})`);
  }
  if (rec.classAvg !== null && rec.classAvg < 0) errors.push('平均分不能为负数');
  if (rec.rank !== null && rec.rank < 0) errors.push('排名不能为负数');
  return { ...rec, isValid: errors.length === 0, errors };
}

const ExamUploader: React.FC<ExamUploaderProps> = ({ studentId, studentName, onSaveComplete }) => {
  const [mode, setMode] = useState<TabMode>('upload');
  const [records, setRecords] = useState<ExamRecord[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ success: boolean; message: string } | null>(null);

  // OCR 相关状态
  const [ocrImageFile, setOcrImageFile] = useState<File | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string>('');
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ success: boolean; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const manualForm = useState({
    examName: '',
    subject: '',
    score: '',
    fullScore: '100',
    classAvg: '',
    rank: '',
    examDate: '',
  });
  const [form, setForm] = manualForm;

  const stats = useMemo(() => {
    const total = records.length;
    const valid = records.filter(r => r.isValid).length;
    const invalid = total - valid;
    return { total, valid, invalid };
  }, [records]);

  const handleFileParse = useCallback((file: File) => {
    setFileName(file.name);
    setSaveResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

        if (jsonData.length < 2) {
          setSaveResult({ success: false, message: '文件内容为空或只有表头，请检查文件' });
          return;
        }

        const headers = (jsonData[0] as unknown[]).map(h => String(h ?? ''));
        const mapping = mapHeaders(headers);

        if (mapping.size === 0) {
          setSaveResult({ success: false, message: '未能识别列名，请确保包含"姓名/学生"、"科目"、"分数"等标准列名' });
          return;
        }

        const parsed: ExamRecord[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          if (row.every(cell => cell == null || String(cell).trim() === '')) continue;

          const getVal = (key: keyof ExamRecord): unknown => {
            const colIdx = mapping.get(key);
            return colIdx != null ? row[colIdx] : undefined;
          };

          const rawExamName = getVal('examName');
          const rawSubject = getVal('subject');

          let examName = '';
          let subject = '';

          if (rawExamName != null) examName = String(rawExamName).trim();

          if (rawSubject != null) subject = String(rawSubject).trim();

          if (!examName && headers.some(h => {
            const norm = normalizeColumnName(h);
            return ['姓名', '名字', '学生', '姓名/学生', '学生姓名', 'name', 'student', 'studentname'].includes(norm);
          })) {
            const nameColIdx = headers.findIndex(h => {
              const norm = normalizeColumnName(h);
              return ['姓名', '名字', '学生', '姓名/学生', '学生姓名', 'name', 'student', 'studentname'].includes(norm);
            });
            if (nameColIdx >= 0) {
              const nameVal = row[nameColIdx];
              if (nameVal != null && String(nameVal).trim() !== '') {
                examName = `${String(nameVal).trim()} 的考试成绩`;
              }
            }
          }

          const rec: ExamRecord = validateRecord({
            id: generateId(),
            examName,
            subject,
            score: parseCellValue(getVal('score')),
            fullScore: parseCellValue(getVal('fullScore')) || 100,
            classAvg: parseCellValue(getVal('classAvg')),
            rank: parseCellValue(getVal('rank')) != null
              ? Math.round(parseCellValue(getVal('rank'))!)
              : null,
            examDate: parseDateValue(getVal('examDate')),
            isValid: true,
            errors: [],
          });

          parsed.push(rec);
        }

        setRecords(parsed);
      } catch {
        setSaveResult({ success: false, message: '文件解析失败，请确认文件格式正确（支持 .xlsx / .xls / .csv）' });
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileParse(file);
  }, [handleFileParse]);

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileParse(file);
    e.target.value = '';
  }, [handleFileParse]);

  // OCR 相关处理函数
  const handleOcrImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!IMAGE_EXTENSIONS.includes(file.type)) {
      setOcrResult({ success: false, message: '请选择图片文件（支持 JPG/PNG/WebP 格式）' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setOcrResult({ success: false, message: '图片大小不能超过10MB' });
      return;
    }

    setOcrImageFile(file);
    setOcrImagePreview(URL.createObjectURL(file));
    setOcrResult(null);
    e.target.value = '';
  }, []);

  const handleOrcClickUpload = useCallback(() => {
    ocrInputRef.current?.click();
  }, []);

  const handleOcrProcess = useCallback(async () => {
    if (!ocrImageFile) {
      setOcrResult({ success: false, message: '请先选择成绩单图片' });
      return;
    }

    setOcrProcessing(true);
    setOcrResult(null);

    try {
      const res = await uploadFile('/api/ocr/exam', ocrImageFile, 'image');

      if (!res.ok) {
        throw new Error((res.data as Record<string, unknown>)?.error as string || `识别失败 (${res.status})`);
      }

      const result = res.data as { success?: boolean; records?: ExamRecord[]; error?: string };

      if (result.success && result.records && Array.isArray(result.records)) {
        const ocrRecords: ExamRecord[] = result.records.map((rec: ExamRecord) =>
          validateRecord(rec)
        );
        
        if (ocrRecords.length === 0) {
          setOcrResult({ success: false, message: '未能从图片中提取到有效成绩数据' });
          return;
        }
        
        setRecords(prev => [...prev, ...ocrRecords]);
        setOcrResult({
          success: true,
          message: `✅ 成功识别 ${ocrRecords.length} 条成绩记录，请核对后保存`
        });

        setTimeout(() => {
          setOcrImageFile(null);
          setOcrImagePreview('');
        }, 2000);
      } else {
        throw new Error(result.error || '识别结果为空');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? getErrorMessage(err, 'AI识别失败，请检查图片后重试') : '识别失败，请重试';
      setOcrResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setOcrProcessing(false);
    }
  }, [ocrImageFile]);

  const handleOcrClearImage = useCallback(() => {
    setOcrImageFile(null);
    setOcrImagePreview('');
    setOcrResult(null);
  }, []);

  const handleManualAdd = useCallback(() => {
    const rec: ExamRecord = validateRecord({
      id: generateId(),
      examName: form.examName.trim(),
      subject: form.subject.trim(),
      score: form.score !== '' ? Number(form.score) : null,
      fullScore: Number(form.fullScore) || 100,
      classAvg: form.classAvg !== '' ? Number(form.classAvg) : null,
      rank: form.rank !== '' ? Math.round(Number(form.rank)) : null,
      examDate: form.examDate,
      isValid: true,
      errors: [],
    });
    setRecords(prev => [...prev, rec]);
    setForm({ examName: '', subject: '', score: '', fullScore: '100', classAvg: '', rank: '', examDate: '' });
  }, [form]);

  const handleCellEdit = useCallback((id: string, field: keyof ExamRecord, value: string | number | null) => {
    setRecords(prev =>
      prev.map(r => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        return validateRecord(updated);
      }),
    );
  }, []);

  const handleDeleteRecord = useCallback((id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setRecords([]);
    setFileName('');
    setSaveResult(null);
  }, []);

  const handleSave = useCallback(async () => {
    const validRecords = records.filter(r => r.isValid);
    if (validRecords.length === 0) {
      setSaveResult({ success: false, message: '没有有效的数据可保存' });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const payload = validRecords.map(r => ({
        studentId,
        examName: r.examName,
        subject: r.subject,
        score: r.score,
        fullScore: r.fullScore,
        classAvg: r.classAvg,
        rank: r.rank,
        examDate: r.examDate || null,
      }));

      const res = await api.post('/api/exams', payload);

      setSaveResult({ success: true, message: `成功保存 ${validRecords.length} 条考试成绩` });
      onSaveComplete?.(validRecords.length);
    } catch (err: unknown) {
      setSaveResult({ success: false, message: `保存失败：${getErrorMessage(err, '未知错误')}` });
    } finally {
      setSaving(false);
    }
  }, [records, studentId, onSaveComplete]);

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* 标题 */}
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <span className="text-lg">📊</span>
        <h3 className="text-base font-semibold text-[#1E293B]">考试成绩管理</h3>
        <span className="ml-auto text-xs text-slate-400">当前学生：{studentName}</span>
      </div>

      {/* Tab 切换 */}
      <div className="flex border-b border-slate-100 px-5">
        {(['upload', 'manual', 'ocr'] as TabMode[]).map(tab => (
          <button
            key={tab}
            onClick={() => setMode(tab)}
            className={clsx(
              'relative px-4 py-3 text-sm font-medium transition-colors',
              mode === tab
                ? 'text-blue-600'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab === 'upload' ? '📁 上传 Excel' : tab === 'manual' ? '✏️ 手动录入' : '📷 拍照识别'}
            {mode === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-blue-500" />
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* 上传模式 */}
        {mode === 'upload' && (
          <div>
            <div
              onClick={handleClickUpload}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={clsx(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all',
                isDragging
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50',
              )}
            >
              <div className="mb-3 text-4xl">{isDragging ? '📥' : '📄'}</div>
              <p className="text-sm font-medium text-slate-700">
                {isDragging ? '释放文件以上传' : '拖拽 Excel 文件到此处，或点击选择'}
              </p>
              <p className="mt-1 text-xs text-slate-400">支持 .xlsx / .xls / .csv 格式</p>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_EXTENSIONS.join(',')}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {fileName && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>📎</span>
                <span>{fileName}</span>
              </div>
            )}

            <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
              💡 支持自动识别列名：考试名称、科目、分数、满分、班级平均分、排名、考试日期
            </div>
          </div>
        )}

        {/* 手动录入模式 */}
        {mode === 'manual' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { key: 'examName', label: '考试名称 *', placeholder: '如：期中考试' },
                { key: 'subject', label: '科目 *', placeholder: '如：数学' },
                { key: 'score', label: '分数', placeholder: '如：92' },
                { key: 'fullScore', label: '满分', placeholder: '默认100' },
                { key: 'classAvg', label: '班级均分', placeholder: '可选' },
                { key: 'rank', label: '排名', placeholder: '可选' },
                { key: 'examDate', label: '考试日期', placeholder: 'YYYY-MM-DD' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
                  <input
                    type={key === 'examDate' ? 'date' : key === 'score' || key === 'fullScore' || key === 'classAvg' || key === 'rank' ? 'number' : 'text'}
                    value={(form as Record<string, string>)[key]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={handleManualAdd}
              disabled={!form.examName.trim() || !form.subject.trim()}
              className={clsx(
                'mt-3 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                form.examName.trim() && form.subject.trim()
                  ? 'bg-blue-500 text-white shadow hover:bg-blue-600'
                  : 'cursor-not-allowed bg-slate-200 text-slate-400',
              )}
            >
              + 添加成绩
            </button>
          </div>
        )}

        {/* OCR 拍照识别模式 */}
        {mode === 'ocr' && (
          <div>
            {/* 图片上传区域 */}
            {!ocrImagePreview ? (
              <div
                onClick={handleOrcClickUpload}
                className={clsx(
                  'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-all',
                  'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50',
                )}
              >
                <div className="mb-3 text-4xl">📷</div>
                <p className="text-sm font-medium text-slate-700">
                  点击选择或拍摄成绩单图片
                </p>
                <p className="mt-1 text-xs text-slate-400">支持 JPG / PNG / WebP 格式，最大10MB</p>

                <input
                  ref={ocrInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleOcrImageSelect}
                  capture="environment"
                  className="hidden"
                />
              </div>
            ) : (
              /* 图片预览区域 */
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-lg border border-slate-200">
                  <img
                    src={ocrImagePreview}
                    alt="成绩单预览"
                    className="h-auto w-full object-contain"
                    style={{ maxHeight: '400px' }}
                  />
                  <button
                    onClick={handleOcrClearImage}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-lg transition-colors hover:bg-red-600"
                    title="清除图片"
                  >
                    ✕
                  </button>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3">
                  <button
                    onClick={handleOcrProcess}
                    disabled={ocrProcessing}
                    className={clsx(
                      'flex-1 rounded-lg px-6 py-3 text-sm font-medium text-white shadow transition-all',
                      ocrProcessing
                        ? 'cursor-not-allowed bg-blue-300'
                        : 'bg-blue-500 hover:bg-blue-600',
                    )}
                  >
                    {ocrProcessing ? '⏳ AI正在识别...' : '🔍 开始AI识别'}
                  </button>
                  <button
                    onClick={handleOcrClearImage}
                    disabled={ocrProcessing}
                    className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    重新选择
                  </button>
                </div>

                {/* OCR 结果提示 */}
                {ocrResult && (
                  <div
                    className={clsx(
                      'rounded-lg px-4 py-3 text-sm',
                      ocrResult.success
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-red-50 text-red-700 border border-red-200',
                    )}
                  >
                    {ocrResult.message}
                  </div>
                )}

                {/* 提示信息 */}
                <div className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  💡 **使用技巧**：
                  <br />• 确保照片清晰，文字可读
                  <br />• 避免反光和阴影
                  <br />• 支持表格形式的成绩单、成绩条、Excel截图等
                  <br />• AI会自动识别并提取成绩数据，请核对后保存
                </div>
              </div>
            )}
          </div>
        )}

        {/* 数据预览区 */}
        {records.length > 0 && (
          <div className="mt-5">
            {/* 统计信息 */}
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs">
              <span className="font-medium text-slate-700">
                共 <strong>{stats.total}</strong> 条数据
              </span>
              <span className="text-green-600">
                ✓ 有效 <strong>{stats.valid}</strong> 条
              </span>
              {stats.invalid > 0 && (
                <span className="text-red-500">
                  ⚠ 异常 <strong>{stats.invalid}</strong> 条
                </span>
              )}
              <button
                onClick={handleClearAll}
                className="ml-auto text-red-500 hover:text-red-700 underline"
              >
                清空全部
              </button>
            </div>

            {/* 预览表格 */}
            <div className="max-h-[360px] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100">
                  <tr>
                    {['考试名称', '科目', '分数', '满分', '班级均分', '排名', '日期', '状态'].map(h => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-600">
                        {h}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-xs font-semibold text-slate-600">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map(rec => (
                    <tr
                      key={rec.id}
                      className={clsx(!rec.isValid && 'bg-red-50/50')}
                    >
                      <td className="px-3 py-1.5">
                        <input
                          value={rec.examName}
                          onChange={e => handleCellEdit(rec.id, 'examName', e.target.value)}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          value={rec.subject}
                          onChange={e => handleCellEdit(rec.id, 'subject', e.target.value)}
                          className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-slate-700 outline-none hover:border-slate-300 focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={rec.score ?? ''}
                          onChange={e => handleCellEdit(rec.id, 'score', e.target.value === '' ? null : Number(e.target.value))}
                          className={clsx(
                            'w-16 rounded border border-transparent bg-transparent px-1 py-0.5 outline-none hover:border-slate-300 focus:border-blue-400 focus:bg-white',
                            rec.score != null && rec.fullScore > 0 && rec.score > rec.fullScore && 'font-bold text-red-600',
                            rec.score != null && rec.score < 0 && 'font-bold text-red-600',
                          )}
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={rec.fullScore}
                          onChange={e => handleCellEdit(rec.id, 'fullScore', Number(e.target.value) || 100)}
                          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 outline-none hover:border-slate-300 focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={rec.classAvg ?? ''}
                          onChange={e => handleCellEdit(rec.id, 'classAvg', e.target.value === '' ? null : Number(e.target.value))}
                          className="w-16 rounded border border-transparent bg-transparent px-1 py-0.5 outline-none hover:border-slate-300 focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="number"
                          value={rec.rank ?? ''}
                          onChange={e => handleCellEdit(rec.id, 'rank', e.target.value === '' ? null : Math.round(Number(e.target.value)))}
                          className="w-14 rounded border border-transparent bg-transparent px-1 py-0.5 outline-none hover:border-slate-300 focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="date"
                          value={rec.examDate}
                          onChange={e => handleCellEdit(rec.id, 'examDate', e.target.value)}
                          className="w-28 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs outline-none hover:border-slate-300 focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        {rec.isValid ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            ✓ 有效
                          </span>
                        ) : (
                          <span className="cursor-help inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700" title={rec.errors.join('; ')}>
                            ⚠ 异常
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <button
                          onClick={() => handleDeleteRecord(rec.id)}
                          className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          删除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 保存结果提示 */}
        {saveResult && (
          <div
            className={clsx(
              'mt-4 rounded-lg px-4 py-3 text-sm',
              saveResult.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200',
            )}
          >
            {saveResult.success ? '✅' : '❌'} {saveResult.message}
          </div>
        )}

        {/* 底部操作按钮 */}
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={handleClearAll}
            disabled={records.length === 0 || saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            清空
          </button>
          <button
            onClick={handleSave}
            disabled={records.length === 0 || saving || stats.valid === 0}
            className={clsx(
              'rounded-lg px-6 py-2 text-sm font-medium text-white shadow transition-all',
              records.length > 0 && !saving && stats.valid > 0
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'cursor-not-allowed bg-slate-300',
            )}
          >
            {saving ? '⏳ 保存中...' : `💾 保存${stats.valid > 0 ? ` (${stats.valid}条)` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExamUploader;
