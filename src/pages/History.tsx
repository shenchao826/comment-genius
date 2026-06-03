import { useState, useEffect, useMemo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import SEO from '../components/SEO';
import { clipboardService } from '../services/clipboard';
import { historyCache } from '../services/historyCache';
import { getRoleById } from '../data/class-roles';
import { api } from '../utils/apiClient';

interface CommentRecord {
  id: string;
  student_name: string;
  content: string;
  traits: string[];
  class_role?: string | null;
  comment_type: string;
  tone_style: string;
  created_at: string;
  is_favorited?: boolean;
}

const COMMENT_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'summary', label: '期末总结' },
  { value: 'encouragement', label: '日常鼓励' },
  { value: 'improvement', label: '改进建议' },
  { value: 'parent', label: '家长沟通' },
  { value: 'midterm', label: '期中反馈' },
  { value: 'single_subject', label: '单科评语' },
  { value: 'growth_report', label: '成长简报' }
];

const STYLE_OPTIONS = [
  { value: 'all', label: '全部风格' },
  { value: 'gentle', label: '温和鼓励' },
  { value: 'formal', label: '正式严谨' },
  { value: 'humorous', label: '幽默亲切' },
  { value: 'objective', label: '客观中立' },
  { value: 'warm', label: '温暖亲切' }
];

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'week', label: '最近7天' },
  { value: 'month', label: '最近30天' },
  { value: 'quarter', label: '最近3个月' }
];

const History: FC = () => {
  const navigate = useNavigate();
  const [comments, setComments] = useState<CommentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComment, setSelectedComment] = useState<CommentRecord | null>(null);

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name'>('date_desc');
  const [copyFeedback, setCopyFeedback] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });

  useEffect(() => {
    const localComments = historyCache.getRecent(50);
    if (localComments.length > 0) {
      setComments(localComments.map((c) => ({
        id: c.id || c.localId,
        student_name: c.student_name,
        content: c.content,
        traits: c.traits,
        class_role: c.class_role || null,
        comment_type: c.comment_type,
        tone_style: c.tone_style,
        created_at: c.created_at,
        is_favorited: c.is_favorited,
      })));
      setIsLoading(false);
    }

    const fetchRemoteHistory = async () => {
      try {
        const res = await api.get('/comments');

        if (res.data) {
          const remoteComments = (res.data as any).comments || [];
          historyCache.mergeWithRemote(remoteComments);
          setComments(historyCache.getRecent(50).map((c) => ({
            id: c.id || c.localId,
            student_name: c.student_name,
            content: c.content,
            traits: c.traits,
            class_role: c.class_role || null,
            comment_type: c.comment_type,
            tone_style: c.tone_style,
            created_at: c.created_at,
            is_favorited: c.is_favorited,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch remote history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRemoteHistory();
  }, []);

  // 筛选和搜索逻辑
  const filteredComments = useMemo(() => {
    let result = [...comments];

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        comment =>
          comment.student_name.toLowerCase().includes(query) ||
          comment.content.toLowerCase().includes(query)
      );
    }

    // 类型过滤
    if (selectedType !== 'all') {
      result = result.filter(comment => comment.comment_type === selectedType);
    }

    // 风格过滤
    if (selectedStyle !== 'all') {
      result = result.filter(comment => comment.tone_style === selectedStyle);
    }

    // 收藏过滤
    if (showFavoritesOnly) {
      result = result.filter(comment => comment.is_favorited);
    }

    // 日期范围过滤
    if (selectedDateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (selectedDateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      result = result.filter(comment => new Date(comment.created_at) >= startDate);
    }

    // 排序
    switch (sortBy) {
      case 'date_asc':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'date_desc':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'name':
        result.sort((a, b) => a.student_name.localeCompare(b.student_name));
        break;
    }

    return result;
  }, [comments, searchQuery, selectedType, selectedStyle, selectedDateRange, showFavoritesOnly, sortBy]);

  const handleCopy = async (content: string, studentName?: string) => {
    const result = await clipboardService.copy(content, {
      formatAs: 'styled',
      studentName,
      title: '学生评语',
    });
    setCopyFeedback({ visible: true, message: result.message });
    setTimeout(() => setCopyFeedback((prev) => ({ ...prev, visible: false })), 2000);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedType('all');
    setSelectedStyle('all');
    setSelectedDateRange('all');
    setShowFavoritesOnly(false);
    setSortBy('date_desc');
  };

  const hasActiveFilters = searchQuery || selectedType !== 'all' || selectedStyle !== 'all' ||
    selectedDateRange !== 'all' || showFavoritesOnly;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <SEO
        title="历史记录"
        description="查看和管理您生成的所有评语记录"
      />

      {copyFeedback.visible && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium shadow-lg animate-fade-in-up">
          📋 {copyFeedback.message}
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📜</span>
            <h1 className="text-3xl font-bold text-slate-900">历史记录</h1>
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium">
              共 {filteredComments.length} 条
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/')} size="sm">
              ← 返回首页
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearFilters} size="sm">
                ✕ 清除筛选
              </Button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 搜索学生名字或评语内容..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">🔍</span>
          </div>

          {/* Filter Row 1: Type + Style + Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {COMMENT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {STYLE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={selectedDateRange}
              onChange={(e) => setSelectedDateRange(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {DATE_FILTER_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Row 2: Favorites + Sort */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => setShowFavoritesOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">仅显示收藏</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">排序:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="date_desc">最新优先</option>
                <option value="date_asc">最早优先</option>
                <option value="name">按姓名</option>
              </select>
            </div>
          </div>
        </div>

        {/* Comments List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-white rounded-xl border border-slate-200 animate-pulse"
              />
            ))}
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">{hasActiveFilters ? '🔍' : '📝'}</div>
            <p className="text-slate-500 text-lg">
              {hasActiveFilters ? '没有找到匹配的评语记录' : '暂无历史记录'}
            </p>
            {hasActiveFilters && (
              <Button variant="secondary" onClick={clearFilters}>清除筛选条件</Button>
            )}
            {!hasActiveFilters && (
              <Button onClick={() => navigate('/')}>开始生成评语</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredComments.map((comment) => (
              <div
                key={comment.id}
                className={`bg-white rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md ${
                  selectedComment?.id === comment.id
                    ? 'border-blue-400 shadow-md'
                    : 'border-slate-200'
                } p-5 shadow-sm`}
                onClick={() =>
                  setSelectedComment(selectedComment?.id === comment.id ? null : comment)
                }
              >
                <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                      {comment.student_name}
                    </span>
                    {comment.class_role && (() => {
                      const role = getRoleById(comment.class_role);
                      return role ? (
                        <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium" title={role.description}>
                          {role.icon} {role.name}
                        </span>
                      ) : null;
                    })()}
                    <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs">
                      {COMMENT_TYPE_OPTIONS.find(t => t.value === comment.comment_type)?.label || comment.comment_type}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs">
                      {STYLE_OPTIONS.find(s => s.value === comment.tone_style)?.label || comment.tone_style}
                    </span>
                    {comment.is_favorited && (
                      <span className="text-yellow-500">⭐</span>
                    )}
                    <span className="text-xs text-slate-400">
                      {new Date(comment.created_at).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(comment.content, comment.student_name);
                    }}
                    className="px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    📋 复制
                  </button>
                </div>

                <p className="text-slate-700 text-sm leading-relaxed line-clamp-2">
                  {comment.content}
                </p>

                {selectedComment?.id === comment.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                      {comment.content}
                    </p>
                    {comment.class_role && (() => {
                      const role = getRoleById(comment.class_role);
                      return role ? (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                          <span>{role.icon}</span>
                          <span className="text-xs font-semibold text-amber-800">{role.name}</span>
                          <span className="text-xs text-amber-600">{role.description}</span>
                        </div>
                      ) : null;
                    })()}
                    <div className="mt-3 flex flex-wrap gap-1">
                      {comment.traits.map((trait) => (
                        <span
                          key={trait}
                          className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 text-xs"
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
