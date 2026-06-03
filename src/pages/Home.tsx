import { useState, useEffect, useRef, useCallback, useMemo, type FC } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../components/Button';
import { Input, Textarea } from '../components/Input';
import SEO from '../components/SEO';
import { getErrorMessage, AppException } from '../utils/errorHandling';
import { api } from '../utils/apiClient';
import TraitSelector from '../components/TraitSelector';
import RoleSelector from '../components/RoleSelector';
import ResultCard from '../components/ResultCard';
import { colors, radii, shadows, motion, components } from '../config/design-tokens';
import { favoritesService } from '../services/favorites';
import { clipboardService } from '../services/clipboard';
import { historyCache } from '../services/historyCache';
import { checkAndDecrementQuota } from '../services/quota';
import ExamUploader from '../components/ExamUploader';
import ExamAnalyzer from '../components/ExamAnalyzer';
import ConversationForm from '../components/ConversationForm';
import HomeVisitForm from '../components/HomeVisitForm';
import BehaviorQuickLog from '../components/BehaviorQuickLog';
import FaqSection from '../components/FaqSection';

const RAG_API_BASE = import.meta.env.VITE_RAG_API_URL || '';

const traitCategories = [
  {
    id: 'attitude',
    key: 'category_attitude', // 学习态度
    traits: [
      { id: 'serious', labelKey: 'trait_serious' },
      { id: 'active_thinking', labelKey: 'trait_active_thinking' },
      { id: 'ask_questions', labelKey: 'trait_ask_questions' },
      { id: 'focused', labelKey: 'trait_focused' },
      { id: 'enthusiasm', labelKey: 'trait_enthusiasm' },
      { id: 'self_disciplined', labelKey: 'trait_self_disciplined' },
    ],
  },
  {
    id: 'moral',
    key: 'category_moral', // 品德素养（新增！）
    traits: [
      { id: 'honest', labelKey: 'trait_honest' },
      { id: 'helpful', labelKey: 'trait_helpful' },
      { id: 'respectful', labelKey: 'trait_respectful' }, // 新增：尊敬师长
      { id: 'responsible', labelKey: 'trait_responsible' }, // 新增：责任心强
      { id: 'cooperative', labelKey: 'trait_cooperative' }, // 新增：团结友爱
      { id: 'polite', labelKey: 'trait_polite' }, // 新增：文明礼貌
    ],
  },
  {
    id: 'performance',
    key: 'category_performance', // 课堂表现
    traits: [
      { id: 'participate', labelKey: 'trait_participate' },
      { id: 'discuss', labelKey: 'trait_discuss' },
      { id: 'teamwork', labelKey: 'trait_teamwork' },
      { id: 'leadership', labelKey: 'trait_leadership' },
      { id: 'expression', labelKey: 'trait_expression' },
      { id: 'discipline', labelKey: 'trait_discipline' },
    ],
  },
  {
    id: 'comprehensive',
    key: 'category_comprehensive', // 综合素质
    traits: [
      { id: 'neat_writing', labelKey: 'trait_neat_writing' },
      { id: 'on_time', labelKey: 'trait_on_time' },
      { id: 'independent', labelKey: 'trait_independent' },
      { id: 'high_quality', labelKey: 'trait_high_quality' },
      { id: 'creative', labelKey: 'trait_creative' },
      { id: 'athletic', labelKey: 'trait_athletic' },
    ],
  },
];

const commentTypes = [
  { id: 'summary', labelKey: 'type_summary' },
  { id: 'encouragement', labelKey: 'type_encouragement' },
  { id: 'improvement', labelKey: 'type_improvement' },
  { id: 'parent', labelKey: 'type_parent' },
];

const toneStyles = [
  { id: 'gentle', labelKey: 'tone_gentle' }, // 温和鼓励型
  { id: 'strict', labelKey: 'tone_strict' }, // 严谨客观型
  { id: 'humorous', labelKey: 'tone_humorous' }, // 幽默亲切型
];

const lengthOptions = [
  { id: 'concise', labelKey: 'length_concise', min: 80, max: 120 }, // 精简 80-120字
  { id: 'standard', labelKey: 'length_standard', min: 200, max: 300 }, // 标准 200-300字
  { id: 'detailed', labelKey: 'length_detailed', min: 400, max: 500 }, // 详细 400-500字
];

const Home: FC = () => {
  const { t, i18n } = useTranslation();
  const [studentName, setStudentName] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [commentType, setCommentType] = useState('summary');
  const [toneStyle, setToneStyle] = useState('gentle'); // 默认温和鼓励型
  const [commentLength, setCommentLength] = useState('standard');
  const [supplement, setSupplement] = useState('');
  const [generatedComment, setGeneratedComment] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [remainingCount, setRemainingCount] = useState(3);
  const [error, setError] = useState('');
  const [chunkCount, setChunkCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [commentId, setCommentId] = useState<string | null>(null);
  const [favToast, setFavToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'success',
  });
  const [examData, setExamData] = useState<any[]>([]);
  const [showExamPanel, setShowExamPanel] = useState(false);
  const [conversationData, setConversationData] = useState<any[]>([]);
  const [showConversationPanel, setShowConversationPanel] = useState(false);
  const [homeVisitData, setHomeVisitData] = useState<any[]>([]);
  const [showHomeVisitPanel, setShowHomeVisitPanel] = useState(false);
  const [behaviorData, setBehaviorData] = useState<any[]>([]);
  const [showBehaviorPanel, setShowBehaviorPanel] = useState(false);
  const [copyToast, setCopyToast] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  const [dedupInfo, setDedupInfo] = useState<{ similarity: number; is_duplicate: boolean; retry_count: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleToggleFavorite = useCallback(async () => {
    if (!commentId) return;
    const newFavState = !isFavorited;
    setIsFavorited(newFavState);

    favoritesService.toggle({
      commentId,
      content: generatedComment,
      studentName: studentName.trim(),
      traits: selectedTraits,
      commentType: commentType,
      toneStyle: toneStyle,
    });

    setFavToast({
      visible: true,
      message: newFavState ? '已添加到收藏' : '已取消收藏',
      type: 'success',
    });
    setTimeout(() => setFavToast((prev) => ({ ...prev, visible: false })), 2000);

    const syncResult = await favoritesService.syncToRemote(
      commentId,
      newFavState,
      () => RAG_API_BASE,
    );
    if (!syncResult.success) {
      setFavToast({
        visible: true,
        message: syncResult.error || '同步失败，已保存到本地',
        type: 'error',
      });
      setTimeout(() => setFavToast((prev) => ({ ...prev, visible: false })), 3000);
    }
  }, [commentId, isFavorited, generatedComment, studentName, selectedTraits, commentType, toneStyle]);

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const { quotaService } = await import('../services/quota');
        const info = await quotaService.getQuotaInfo();
        setRemainingCount(info.isPremium ? 999 : info.remaining);
      } catch (error) {
        console.error('Failed to fetch quota:', error);
      }
    };

    fetchQuota();
  }, []);

  useEffect(() => {
    if (showResult && !isGenerating) {
      const timer = setTimeout(() => {
        const resultElement = document.getElementById('result-card');
        if (resultElement) {
          resultElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showResult, isGenerating]);

  const toggleTrait = (traitId: string) => {
    setSelectedTraits((prev) =>
      prev.includes(traitId) ? prev.filter((id) => id !== traitId) : [...prev, traitId],
    );
  };

  const fetchExamData = useCallback(async (name: string) => {
    try {
      const res = await api.get(`/api/exams?student_name=${encodeURIComponent(name.trim())}`);
      if (res.ok) {
        setExamData((res.data as any).exams || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchConversationData = useCallback(async (name: string) => {
    try {
      const res = await api.get(`/api/conversations?student_name=${encodeURIComponent(name.trim())}&limit=10`);
      if (res.ok) {
        setConversationData((res.data as any).data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchHomeVisitData = useCallback(async (name: string) => {
    try {
      const res = await api.get(`/api/home-visits?student_name=${encodeURIComponent(name.trim())}&limit=10`);
      if (res.ok) {
        setHomeVisitData((res.data as any).data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const fetchBehaviorData = useCallback(async (name: string) => {
    try {
      const res = await api.get(`/api/behaviors?student_name=${encodeURIComponent(name.trim())}&limit=20`);
      if (res.ok) {
        setBehaviorData((res.data as any).data || []);
      }
    } catch { /* ignore */ }
  }, []);

  const handleGenerate = async () => {
    if (!studentName.trim()) return;
    if (remainingCount <= 0) {
      setError(t('quota_exceeded'));
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setShowResult(false);
    setError('');
    setChunkCount(0);
    setGeneratedComment('');
    setCommentId(null);
    setIsFavorited(false);
    setDedupInfo(null);

    try {
      const lang = i18n.language?.startsWith('en') ? 'en' : 'zh';

      const quotaResult = await checkAndDecrementQuota();
      if (!quotaResult.canGenerate) {
        setError(quotaResult.message || t('quota_exceeded'));
        setIsGenerating(false);
        return;
      }
      if (quotaResult.quotaInfo) {
        const newRemaining = quotaResult.quotaInfo.isPremium ? 999 : quotaResult.quotaInfo.remaining;
        setRemainingCount(newRemaining);
      }

      const response = await fetch(`${RAG_API_BASE}/api/rag/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          query: `${lang === 'zh' ? '为学生' : 'For student'} ${studentName.trim()} ${lang === 'zh' ? '撰写评语' : 'write a comment'}`,
          productLine: 'teachers',
          context: {
            studentInfo: {
              name: studentName.trim(),
              traits: selectedTraits,
              classRole: selectedRole,
              commentType: commentType,
              toneStyle: toneStyle,
              commentLength: commentLength,
              supplement: supplement.trim(),
              examData: examData,
              conversationData: conversationData,
              homeVisitData: homeVisitData,
              behaviorData: behaviorData,
            },
          },
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `请求失败 (${response.status})`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        setShowResult(true);
        const reader = response.body?.getReader();
        if (!reader) throw new Error('无法读取响应流');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ')) continue;
            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);

              if (data.error) {
                throw new Error(data.error + (data.detail ? ': ' + data.detail : ''));
              }

              if (data.done) {
                if (data.answer) setGeneratedComment(data.answer);
                if (data.chunk_count !== undefined) setChunkCount(data.chunk_count);
                if (data.dedup) setDedupInfo(data.dedup);
              }

              if (data.text) {
                setGeneratedComment(data.text);
              }
            } catch (parseErr) {
              if (parseErr instanceof SyntaxError) continue;
              throw parseErr;
            }
          }
        }
      } else {
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.answer && !data.answer.startsWith('[RAG Debug')) {
          setGeneratedComment(data.answer);
          setChunkCount(data.chunk_count || 0);
          if (data.dedup) setDedupInfo(data.dedup);
        } else {
          throw new Error(data.answer || 'AI返回内容异常');
        }

        setShowResult(true);
      }

      historyCache.add({
        id: '',
        student_name: studentName.trim(),
        content: generatedComment,
        traits: selectedTraits,
        class_role: selectedRole,
        comment_type: commentType,
        tone_style: toneStyle,
        comment_length: commentLength,
        supplement: supplement.trim(),
        word_count: generatedComment.length,
        is_favorited: false,
        // @ts-expect-error exam_data is a custom field
        exam_data: examData,
        conversation_data: conversationData,
        home_visit_data: homeVisitData,
        behavior_data: behaviorData,
      });

      try {
        const saveRes = await api.post('/api/comments', {
          student_name: studentName.trim(),
          content: generatedComment,
          traits: selectedTraits,
          class_role: selectedRole,
          comment_type: commentType,
          tone_style: toneStyle,
          comment_length: commentLength,
        });
        if (saveRes.ok && (saveRes.data as any).id) {
          setCommentId((saveRes.data as any).id);
          const cached = historyCache.getRecent(1)[0];
          if (cached && !cached.id) {
            historyCache.update(cached.localId, { id: (saveRes.data as any).id, synced: true, syncAttempted: true });
          }
          if (favoritesService.isFavorited((saveRes.data as any).id)) {
            setIsFavorited(true);
          }
        }
      } catch (saveErr) {
        console.error('Save comment failed:', saveErr);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const appErr = AppException.fromError(err);
      console.error('生成评语失败:', appErr.code, appErr.message);
      setError(getErrorMessage(appErr, t('generating_error')));
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  };

  const handleCopy = async () => {
    const result = await clipboardService.copy(generatedComment, {
      formatAs: 'styled',
      studentName: studentName.trim(),
      title: '学生评语',
    });
    setCopyToast({ visible: true, message: result.message });
    setTimeout(() => setCopyToast((prev) => ({ ...prev, visible: false })), 2000);
  };

  const handleFeedback = async (type: 'like' | 'dislike') => {
    if (!commentId) return;
    try {
      await api.post(`/api/comments/${commentId}/feedback`, { feedback: type === 'like' ? 1 : -1 });
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  };

  const traitCategoriesForSelector = useMemo(() => traitCategories.map((cat) => ({
    id: cat.id,
    name: t(cat.key),
    traits: cat.traits.map((trait) => ({
      id: trait.id,
      name: t(trait.labelKey),
    })),
  })), [t]);

  return (
    <div className="min-h-screen bg-white md:bg-[#F8FAFC]">
      {/* Header - 固定顶部导航 */}
      <header className="fixed top-0 left-0 right-0 h-14 md:h-16 bg-white border-b border-slate-200 z-[var(--z-index-sticky,10)]">
        <div className="h-full px-4 md:px-6 flex items-center justify-between max-w-[960px] mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎓</span>
            <span className="text-lg font-semibold text-slate-900">评语助手</span>
          </div>
          <div className="text-sm text-slate-500">AI赋能每一位教师</div>
        </div>
      </header>

      {/* 主内容区域 - 添加顶部间距以避免被固定Header遮挡 */}
      <main className="pt-14 md:pt-16 pb-8">
        <div className="max-w-[960px] mx-auto px-4 md:px-6">
          {/* Desktop 双列布局 */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-8">
            {/* 左侧主内容区 - Mobile全宽 / Desktop 560px */}
            <div className="w-full lg:w-[560px] lg:flex-shrink-0">
              {/* Hero Banner - 品牌展示区 */}
              <div
                className="rounded-xl p-6 md:p-8 mb-5 animate-fade-in-up"
                style={{
                  backgroundColor: colors.primary[50],
                  animationDuration: '400ms',
                  animationFillMode: 'both',
                }}
              >
                <div className="text-center space-y-3">
                  <div className="text-5xl mb-2">🎓</div>
                  <h1 className="text-2xl font-bold" style={{ color: colors.primary[800] }}>
                    AI赋能每一位教师
                  </h1>
                  <p className="text-sm" style={{ color: colors.slate[500] }}>
                    3秒出有温度的学生评语
                  </p>
                </div>
              </div>

              {/* Main Card - 核心表单区（白色卡片） */}
              <div
                className="bg-white rounded-xl shadow-md border border-transparent p-5 md:p-6 mb-5 space-y-4"
                style={{
                  boxShadow: shadows.md,
                  borderRadius: radii.xl,
                }}
              >
                {/* 学生称呼输入 */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">学生称呼</label>
                  <Input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder={t('student_name_placeholder')}
                    disabled={isGenerating}
                  />
                </div>

                {/* 班级职务选择器 */}
                <RoleSelector
                  selectedRole={selectedRole}
                  onSelect={setSelectedRole}
                />

                {/* 成绩数据区域 */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowExamPanel(!showExamPanel)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors mb-2"
                  >
                    <span>📊</span>
                    <span>考试成绩（可选，上传后AI将结合成绩生成评语）</span>
                    <svg className={`w-4 h-4 transition-transform ${showExamPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showExamPanel && (
                    <div className="space-y-3">
                      {/* 已有成绩展示 */}
                      {examData.length > 0 && (
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-700">已录入 {examData.length} 条成绩记录</span>
                          </div>
                          <ExamAnalyzer exams={examData} compact />
                        </div>
                      )}

                      {/* 上传/管理入口 */}
                      <ExamUploader
                        studentId=""
                        studentName={studentName.trim()}
                        onSaveComplete={(count) => {
                          if (count > 0 && studentName.trim()) {
                            fetchExamData(studentName);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 谈话记录区域 */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowConversationPanel(!showConversationPanel)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-teal-600 transition-colors mb-2"
                  >
                    <span>💬</span>
                    <span>沟通谈心（可选，记录后AI将结合谈话内容生成评语）</span>
                    <svg className={`w-4 h-4 transition-transform ${showConversationPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showConversationPanel && (
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                      {conversationData.length > 0 && (
                        <div className="mb-2 text-xs font-medium text-teal-700">
                          已录入 {conversationData.length} 条谈话记录
                        </div>
                      )}
                      <ConversationForm
                        studentId=""
                        studentName={studentName.trim()}
                        onSaveComplete={() => {
                          if (studentName.trim()) fetchConversationData(studentName);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 家访记录区域 */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowHomeVisitPanel(!showHomeVisitPanel)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors mb-2"
                  >
                    <span>🏠</span>
                    <span>家校联系（可选，记录后AI将结合家访情况生成评语）</span>
                    <svg className={`w-4 h-4 transition-transform ${showHomeVisitPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showHomeVisitPanel && (
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                      {homeVisitData.length > 0 && (
                        <div className="mb-2 text-xs font-medium text-indigo-700">
                          已录入 {homeVisitData.length} 条家访/面谈记录
                        </div>
                      )}
                      <HomeVisitForm
                        studentId=""
                        studentName={studentName.trim()}
                        onSaveComplete={() => {
                          if (studentName.trim()) fetchHomeVisitData(studentName);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 行为记录区域 */}
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setShowBehaviorPanel(!showBehaviorPanel)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-purple-600 transition-colors mb-2"
                  >
                    <span>⭐</span>
                    <span>行为表现（可选，记录后AI将结合行为数据生成评语）</span>
                    <svg className={`w-4 h-4 transition-transform ${showBehaviorPanel ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showBehaviorPanel && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      {behaviorData.length > 0 && (
                        <div className="mb-2 text-xs font-medium text-purple-700">
                          已录入 {behaviorData.length} 条行为记录
                        </div>
                      )}
                      <BehaviorQuickLog
                        studentId=""
                        studentName={studentName.trim()}
                        onSaveComplete={() => {
                          if (studentName.trim()) fetchBehaviorData(studentName);
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 特点标签选择器 */}
                <TraitSelector
                  // @ts-expect-error categories is a custom prop
                  categories={traitCategoriesForSelector}
                  selectedTraits={selectedTraits}
                  onToggle={toggleTrait}
                  maxSelections={components.tagChip.maxSelections}
                />

                {/* 补充说明输入 */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    补充说明（可选）
                  </label>
                  <Textarea
                    value={supplement}
                    onChange={(e) => setSupplement(e.target.value.slice(0, 50))}
                    placeholder={t('supplement_placeholder')}
                    maxLength={50}
                    showCount
                    disabled={isGenerating}
                    rows={2}
                  />
                </div>

                {/* 分割线 */}
                <div className="border-t border-slate-100" />

                {/* 评语类型选择器 - 四选一横排 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">评语类型</label>
                  <div className="grid grid-cols-4 gap-2">
                    {commentTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setCommentType(type.id)}
                        disabled={isGenerating}
                        className={`rounded-lg text-xs font-medium transition-all duration-150 ${
                          commentType === type.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{ height: '40px' }}
                      >
                        {t(type.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 风格选择器 - 三选一横排 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">评语风格</label>
                  <div
                    className="grid grid-cols-3 gap-2"
                    style={{ gap: components.styleSelector.gap }}
                  >
                    {toneStyles.map((tone) => (
                      <button
                        key={tone.id}
                        onClick={() => setToneStyle(tone.id)}
                        disabled={isGenerating}
                        className={`relative rounded-lg text-sm font-medium transition-all duration-150 ${
                          toneStyle === tone.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                        } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={{
                          height: components.styleSelector.itemHeight,
                        }}
                      >
                        {t(tone.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 长度选择器 - Radio纵向 */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">评语长度</label>
                  <div className="space-y-1.5">
                    {lengthOptions.map((length) => (
                      <label
                        key={length.id}
                        className={`flex items-center h-11 px-3 rounded-lg cursor-pointer transition-all duration-150 ${
                          commentLength === length.id
                            ? 'bg-blue-50 border border-blue-200'
                            : 'border border-transparent hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="commentLength"
                          value={length.id}
                          checked={commentLength === length.id}
                          onChange={() => setCommentLength(length.id)}
                          disabled={isGenerating}
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-3 text-sm text-slate-700">{t(length.labelKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 错误提示 */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* 生成按钮 */}
                <Button
                  onClick={handleGenerate}
                  loading={isGenerating}
                  disabled={!studentName.trim()}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  ✨ 生成评语
                </Button>
              </div>

              {/* QuotaBanner - 额度进度条 */}
              <div
                className="bg-white rounded-xl p-4 border border-slate-200"
                style={{
                  borderRadius: radii.lg,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">今日免费额度</span>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: remainingCount > 1 ? colors.success.DEFAULT : colors.error.DEFAULT,
                    }}
                  >
                    {remainingCount}/5
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${(remainingCount / 5) * 100}%`,
                      background:
                        remainingCount > 3
                          ? `linear-gradient(to right, ${colors.success.DEFAULT}, ${colors.success.light})`
                          : remainingCount > 1
                            ? `linear-gradient(to right, ${colors.warning.DEFAULT}, ${colors.warning.light})`
                            : `linear-gradient(to right, ${colors.error.DEFAULT}, ${colors.error.light})`,
                    }}
                  />
                </div>
                {remainingCount <= 1 && (
                  <p className="mt-2 text-xs text-orange-600">
                    💡 额度不足？升级Pro版获取无限次生成
                  </p>
                )}
              </div>

              {/* ResultCard - 生成结果卡片 */}
              {showResult && (
                <div
                  id="result-card"
                  className="mt-5 animate-slide-up"
                  style={{
                    animationDuration: '300ms',
                    animationTimingFunction: motion.easing.outExpo,
                    animationFillMode: 'both',
                  }}
                >
                  <ResultCard
                    content={generatedComment}
                    isEditing={isEditing}
                    isFavorited={isFavorited}
                    wordCount={generatedComment.length}
                    onCopy={handleCopy}
                    onEdit={() => setIsEditing(!isEditing)}
                    onSaveEdit={(newContent) => {
                      setGeneratedComment(newContent);
                      setIsEditing(false);
                    }}
                    onRegenerate={handleGenerate}
                    onToggleFavorite={handleToggleFavorite}
                    onFeedback={handleFeedback}
                  />
                  {chunkCount > 0 && (
                    <div className="mt-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        📚 RAG 知识库引用 ×{chunkCount}
                      </span>
                    </div>
                  )}
                  {dedupInfo && (
                    <div className="mt-2 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${dedupInfo.is_duplicate ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                        {dedupInfo.is_duplicate ? '\u26a0\ufe0f' : '\u2705'} \u4e0e\u5386\u53f2\u8bc4\u8bed\u76f8\u4f3c\u5ea6 {Math.round(dedupInfo.similarity * 100)}%
                        {dedupInfo.retry_count > 0 && ` (\u5df2\u81ea\u52a8\u91cd\u8bd5${dedupInfo.retry_count}\u6b21)`}
                      </span>
                    </div>
                  )}

                  {favToast.visible && (
                    <div
                      className={`mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 animate-fade-in-up ${
                        favToast.type === 'success'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      <span>{favToast.type === 'success' ? '✅' : '⚠️'}</span>
                      <span>{favToast.message}</span>
                    </div>
                  )}

                  {copyToast.visible && (
                    <div className="mt-2 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-sm font-medium animate-fade-in-up">
                      <span>📋</span>
                      <span>{copyToast.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 右侧辅助信息区 - 仅Desktop显示 (320px sticky) */}
            <aside className="hidden lg:block w-[320px] flex-shrink-0">
              <div className="sticky top-20 space-y-6">
                {/* 快速提示卡片 */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">💡</span>
                    <div>
                      <h3 className="text-base font-semibold text-slate-900 mb-1">快速提示</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        标签选得越多，评语越个性化。建议选择3-6个特点标签以获得最佳效果。
                      </p>
                    </div>
                  </div>
                  <ul className="space-y-2 mt-4">
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>填写学生真实姓名或昵称</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>补充具体事例会更生动</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>根据场景选择合适风格</span>
                    </li>
                  </ul>
                </div>

                {/* 额度信息卡片 */}
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📊</span>
                      <span className="text-base font-semibold text-slate-900">使用额度</span>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      免费版
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">今日已用</span>
                      <span className="font-medium text-slate-900">{5 - remainingCount}/5 次</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${((5 - remainingCount) / 5) * 100}%`,
                          backgroundColor: colors.primary[500],
                        }}
                      />
                    </div>
                    <Button variant="secondary" size="sm" className="w-full mt-2">
                      ⬆️ 升级 Pro 版
                    </Button>
                  </div>
                </div>

                {/* 特色功能介绍 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">🎯 核心优势</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">⚡</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">极速生成</p>
                        <p className="text-xs text-slate-600 mt-0.5">平均3秒输出高质量评语</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🎨</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">多风格适配</p>
                        <p className="text-xs text-slate-600 mt-0.5">温和/严谨/幽默自由切换</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">📚</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">RAG知识增强</p>
                        <p className="text-xs text-slate-600 mt-0.5">基于教育专业知识库</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ 常见问题 */}
              <div className="mt-6">
                <FaqSection className="text-xs" maxExpanded={1} items={[]} />
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* 自定义动画样式 */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation-name: fade-in-up;
        }

        .animate-slide-up {
          animation-name: slide-up;
        }
      `}</style>
    </div>
  );
};

export default Home;
