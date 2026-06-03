import { useState, type FC } from 'react';
import { clsx } from 'clsx';
import { colors, fonts, spacing, shadows, components } from '../config/design-tokens';
import Button from './Button';

interface ResultCardProps {
  content: string;
  isEditing?: boolean;
  isFavorited?: boolean;
  isPremium?: boolean;
  wordCount?: number;
  onCopy?: () => void;
  onEdit?: () => void;
  onSaveEdit?: (newContent: string) => void;
  onRegenerate?: () => void;
  onToggleFavorite?: () => void;
  onFeedback?: (type: 'like' | 'dislike') => void;
}

const ResultCard: FC<ResultCardProps> = ({
  content,
  isEditing = false,
  isFavorited = false,
  isPremium = false,
  wordCount = 0,
  onCopy,
  onEdit,
  onSaveEdit,
  onRegenerate,
  onToggleFavorite,
  onFeedback,
}) => {
  const [editContent, setEditContent] = useState(content);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      onCopy?.();
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  const handleSaveEdit = () => {
    onSaveEdit?.(editContent);
  };

  const getTopBarColor = () => {
    if (isFavorited) return colors.warning.DEFAULT;
    if (isPremium) return colors.premium;
    return colors.primary[500];
  };

  return (
    <div
      className={clsx(
        'bg-white rounded-xl overflow-hidden border border-transparent',
        'transition-all duration-200',
        isHovered && ['border-[#BFDBFE]', 'shadow-lg', '-translate-y-0.5'],
      )}
      style={{
        boxShadow: isHovered ? shadows.lg : shadows.md,
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 顶部色条 */}
      <div className="w-full h-1" style={{ backgroundColor: getTopBarColor() }} />

      {/* 标题区 */}
      <div
        className="px-5 md:px-6 pt-5 md:pt-6"
        style={{
          padding: `${components.card.contentPadding.mobile} ${components.card.contentPadding.mobile} 0`,
        }}
      >
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <span>📝</span>
          <span>生成的评语</span>
          {isPremium && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              高级
            </span>
          )}
        </h2>
      </div>

      {/* 评语正文区 */}
      <div
        className="px-5 md:px-6 py-5 md:py-6"
        style={{ padding: `${spacing[4]} ${components.card.contentPadding.mobile}` }}
      >
        {isEditing ? (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className={clsx(
              'w-full min-h-[120px] p-3 rounded-lg resize-y',
              'border border-slate-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200',
              'text-base leading-relaxed',
            )}
            style={{
              fontFamily: fonts.family.serif,
              fontSize: fonts.commentBody.size.mobile,
              lineHeight: String(fonts.commentBody.lineHeight),
              letterSpacing: fonts.commentBody.letterSpacing,
              color: fonts.commentBody.color,
            }}
            placeholder="请输入评语内容..."
          />
        ) : (
          <div
            className="whitespace-pre-wrap break-words"
            style={{
              fontFamily: fonts.commentBody.fontFamily,
              fontSize: fonts.commentBody.size.desktop,
              lineHeight: String(fonts.commentBody.lineHeight),
              letterSpacing: fonts.commentBody.letterSpacing,
              color: fonts.commentBody.color,
            }}
          >
            {content || <span className="text-slate-400 italic">暂无评语内容</span>}
          </div>
        )}
      </div>

      {/* 操作按钮组 */}
      <div
        className="px-5 md:px-6 pb-4 flex flex-wrap items-center gap-2"
        style={{
          padding: `0 ${components.card.contentPadding.mobile} ${components.card.actionPadding}`,
        }}
      >
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          📋 复制
        </Button>

        {onRegenerate && (
          <Button variant="ghost" size="sm" onClick={onRegenerate}>
            🔄 重新生成
          </Button>
        )}

        {isEditing ? (
          <>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              💾 保存
            </Button>
            <Button variant="ghost" size="sm" onClick={onEdit}>
              ✕ 取消
            </Button>
          </>
        ) : (
          onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}>
              ✏️ 编辑
            </Button>
          )
        )}

        <Button
          variant={isFavorited ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onToggleFavorite}
          className={clsx(isFavorited && 'text-amber-600 border-amber-300')}
        >
          {isFavorited ? '⭐ 已收藏' : '☆ 收藏'}
        </Button>
      </div>

      {/* 反馈区 */}
      {onFeedback && (
        <div
          className="px-5 md:px-6 pb-3 flex justify-center gap-4 border-t border-slate-100"
          style={{ padding: `${spacing[3]} ${components.card.contentPadding.mobile}` }}
        >
          <button
            onClick={() => onFeedback('like')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              'hover:bg-green-50 hover:text-green-600 text-slate-600',
            )}
          >
            👍 有帮助
          </button>
          <button
            onClick={() => onFeedback('dislike')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
              'hover:bg-red-50 hover:text-red-600 text-slate-600',
            )}
          >
            👎 需改进
          </button>
        </div>
      )}

      {/* 升级引导区 - 仅对免费用户显示 */}
      {!isPremium && (
        <div className="mx-5 md:mx-6 mb-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">✨</span>
                <h3 className="text-sm font-semibold text-blue-900">解锁高级评语功能</h3>
              </div>
              <p className="text-xs text-blue-700 leading-relaxed mb-3">
                升级后可使用：详细评语(400-500字) · 改进建议模板 · 家长沟通风格 · 无限生成次数
              </p>
              <div className="flex items-center gap-2">
                <a
                  href="/membership"
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all',
                    'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow-md',
                  )}
                  style={{
                    backgroundColor: colors.primary[600],
                  }}
                >
                  <span>💎</span>
                  <span>¥1.9 解锁单条</span>
                </a>
                <a
                  href="/membership"
                  className={clsx(
                    'inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    'text-blue-700 hover:text-blue-800 hover:bg-blue-100/50',
                  )}
                >
                  查看套餐 →
                </a>
              </div>
            </div>
            <div className="hidden sm:block text-3xl opacity-20">🚀</div>
          </div>
        </div>
      )}

      {/* 元信息区 */}
      <div
        className="px-5 md:px-6 pb-4 pt-2"
        style={{
          padding: `${spacing[2]} ${components.card.contentPadding.mobile} ${spacing[3]}`,
          fontSize: fonts.size.xs.value,
          color: colors.slate[400],
        }}
      >
        全文共 {wordCount} 字
      </div>
    </div>
  );
};

export default ResultCard;
