import { useState, useCallback, useRef } from 'react';
import { clsx } from 'clsx';
import { debounce } from '../utils/performance';
import {
  generateStudentReport,
  getReportBlob,
  type StudentReportData,
  type ExamData,
  type ConversationData,
  type HomeVisitData,
  type BehaviorData,
} from '../utils/pdfReport';

interface ReportGeneratorProps {
  studentName: string;
  className?: string;
  gender?: string;
  role?: string;
  exams?: ExamData[];
  conversations?: ConversationData[];
  homeVisits?: HomeVisitData[];
  behaviors?: BehaviorData[];
  summary?: string;
  recommendations?: string[];
  teacherName?: string;
  onGenerate?: (blob: Blob) => void;
}

const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  studentName,
  className = '',
  gender = '-',
  role = '',
  exams = [],
  conversations = [],
  homeVisits = [],
  behaviors = [],
  summary = '',
  recommendations = [],
  teacherName = '评语助手',
  onGenerate,
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isGeneratingRef = useRef(false);

  const reportDate = new Date().toISOString().split('T')[0];
  const semester = `${new Date().getFullYear()}-${new Date().getMonth() >= 9 ? '上' : '下'}学期`;

  const buildReportData = useCallback((): StudentReportData => ({
    studentName,
    className: className || '未分配班级',
    gender,
    role,
    teacherName,
    reportDate,
    semester,
    exams,
    conversations,
    homeVisits,
    behaviors,
    summary: summary || `本报告基于${studentName}同学在当前学期的多维度数据自动生成，涵盖成绩表现、行为记录、家校沟通等方面，为教学决策提供数据支持。`,
    recommendations: recommendations && recommendations.length > 0
      ? recommendations
      : [
          '继续保持优势科目的学习状态',
          '针对薄弱科目制定针对性提升计划',
          '积极参与课堂互动，提升学习主动性',
          '保持良好的家校沟通频率',
        ],
  }), [studentName, className, gender, role, teacherName, semester, exams, conversations, homeVisits, behaviors, summary, recommendations]);

  const handlePreview = useCallback(async () => {
    // 防止重复点击
    if (isGenerating || isGeneratingRef.current) return;
    
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const data = buildReportData();
      const blob = getReportBlob(data);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);

      onGenerate?.(blob);
    } catch (err: unknown) {
      console.error('PDF generation error:', err);
      setError('报告生成失败，请重试');
    } finally {
      setIsGenerating(false);
      // 延迟重置防抖锁，防止快速连续点击
      setTimeout(() => {
        isGeneratingRef.current = false;
      }, 1000);
    }
  }, [buildReportData, onGenerate, isGenerating]);

  const handleDownload = useCallback(() => {
    try {
      const data = buildReportData();
      const generator = generateStudentReport(data);
      generator.download(data);
    } catch (err) {
      console.error('PDF download error:', err);
      setError('下载失败，请重试');
    }
  }, [buildReportData]);

  const handleClosePreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  return (
    <div>
      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={handlePreview}
          disabled={isGenerating}
          className={clsx(
            'inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all',
            isGenerating
              ? 'cursor-not-allowed bg-blue-300 text-white'
              : 'bg-blue-500 text-white shadow hover:bg-blue-600 active:bg-blue-700'
          )}
        >
          {isGenerating ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              生成中...
            </>
          ) : (
            <>📄 预览报告</>
          )}
        </button>

        <button
          onClick={handleDownload}
          disabled={isGenerating}
          className={clsx(
            'inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium transition-all',
            isGenerating
              ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
              : 'border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100'
          )}
        >
          📥 下载 PDF
        </button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          ❌ {error}
        </div>
      )}

      {/* 预览弹窗 */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">📄 学情报告预览</h3>
                <p className="mt-0.5 text-xs text-slate-500">{studentName} - {reportDate}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600"
                >
                  💾 保存
                </button>
                <button
                  onClick={handleClosePreview}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  关闭
                </button>
              </div>
            </div>

            {/* PDF 预览区域 */}
            <iframe
              src={previewUrl}
              title="学情报告预览"
              className="flex-1 w-full border-0"
            />
          </div>
        </div>
      )}

      {/* 报告说明 */}
      {!previewUrl && !error && (
        <p className="mt-3 text-xs text-slate-400">
          💡 生成的 PDF 报告包含：成绩概况、行为分析、沟通记录、综合评价与改进建议
        </p>
      )}
    </div>
  );
};

export default ReportGenerator;
