import { useState, useMemo } from 'react';
import { clsx } from 'clsx';

export interface FaqItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
  category: 'usage' | 'billing' | 'data' | 'troubleshoot';
}

export interface FaqConfig {
  title?: string;
  categories?: {
    key: string;
    label: string;
    icon: string;
  }[];
  items: FaqItem[];
  defaultExpanded?: string | null;
  maxExpanded?: number;
  className?: string;
}

const DEFAULT_CATEGORIES = [
  { key: 'usage', label: '使用指南', icon: '📖' },
  { key: 'billing', label: '计费与额度', icon: '💰' },
  { key: 'data', label: '数据与隐私', icon: '🔒' },
  { key: 'troubleshoot', label: '故障排查', icon: '🔧' },
];

const DEFAULT_ITEMS: FaqItem[] = [
  {
    id: 'how-to-generate',
    question: '如何生成一条评语？',
    answer: '只需 3 步：① 输入学生姓名 → ② 选择特点标签（建议3-6个）→ ③ 点击「生成评语」。还可以选择评语类型、风格和长度来个性化输出。',
    category: 'usage',
  },
  {
    id: 'multi-source-data',
    question: '考试成绩、谈话记录等数据有什么用？',
    answer: 'AI 会结合这些多维度数据生成更有针对性的评语。例如：上传成绩后，AI会在评语中提及"数学期中考试取得92分的进步"；记录家访后，评语会体现家校配合的情况。',
    category: 'usage',
  },
  {
    id: 'ocr-recognition',
    question: '拍照识别成绩单准确吗？',
    answer: 'OCR 使用 AI 视觉模型识别，对清晰、正拍的成绩单识别率较高。建议：① 确保照片文字清晰可读 ② 避免反光和阴影 ③ 识别后务必核对数据再保存。支持 JPG/PNG/WebP 格式，最大10MB。',
    category: 'usage',
  },
  {
    id: 'voice-input',
    question: '语音输入如何使用？',
    answer: '在谈话记录或家访表单中，点击 🎤 语音输入按钮，允许浏览器麦克风权限后即可说话。支持中文实时转写，点击停止后自动填入文本。推荐 Chrome/Edge 浏览器以获得最佳体验。',
    category: 'usage',
  },
  {
    id: 'free-quota',
    question: '免费版每天可以生成多少条？',
    answer: '免费版每天 **5 次**生成额度，次日 00:00 自动重置。升级 Pro 版后可获得 **无限次** 生成，并解锁批量生成、高级模板等增值功能。',
    category: 'billing',
  },
  {
    id: 'pro-upgrade',
    question: '如何升级 Pro 版？',
    answer: '点击首页右侧「⬆️ 升级 Pro 版」按钮，或访问个人设置页面完成订阅。Pro 版享受无限次生成、批量评语导出、PDF 学情报告等全部高级功能。',
    category: 'billing',
  },
  {
    id: 'data-security',
    question: '学生数据安全吗？',
    answer: '所有数据均采用 **AES-GCM 加密** 存储，传输过程使用 HTTPS 加密。教师账号的数据完全隔离，学生信息不会跨班级共享。您也可以随时通过「数据导出」功能备份或删除数据。',
    category: 'data',
  },
  {
    id: 'data-export',
    question: '如何导出学生数据？',
    answer: '多种导出方式：① 学生详情页 → 「📤 导出数据」CSV ② 数据看板页 → 「📤 导出数据」班级汇总 ③ 批量生成完成后可直接下载 CSV。PDF 学情报告可通过学生详情页的「📄 学情报告」区域生成。',
    category: 'data',
  },
  {
    id: 'pwa-offline',
    question: '断网时可以使用吗？',
    answer: '支持！应用已启用 PWA 离线模式，首次加载后会缓存核心资源。离线状态下可以浏览已有数据和历史记录，但生成评语等需要联网的功能会自动排队，恢复网络后同步执行。',
    category: 'data',
  },
  {
    id: 'generation-failed',
    question: '生成评语失败怎么办？',
    answer: '常见原因及解决方法：① **网络问题** — 检查网络连接后重试 ② **登录过期** — 重新登录即可 ③ **额度用完** — 等待明日重置或升级 Pro 版 ④ **内容过长** — 补充说明限制50字以内。如仍无法解决，请刷新页面后重试。',
    category: 'troubleshoot',
  },
  {
    id: 'login-expired',
    question: '提示"登录已过期"怎么办？',
    answer: '这是正常的会话超时机制（通常24小时）。点击任意需要登录的操作会自动跳转到登录页面，重新登录后即可继续使用，之前的所有数据都不会丢失。',
    category: 'troubleshoot',
  },
  {
    id: 'browser-support',
    question: '支持哪些浏览器？',
    answer: '推荐使用 **Chrome 90+** 或 **Edge 90+** 以获得最佳体验。Firefox 和 Safari 也支持基础功能，但部分特性（如语音输入）可能表现不同。暂不支持 IE 浏览器。',
    category: 'troubleshoot',
  },
];

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={clsx('w-4 h-4 text-slate-400 transition-transform duration-200', expanded && 'rotate-180')}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FaqAccordionItem({
  item,
  isExpanded,
  onToggle,
}: {
  item: FaqItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden transition-colors hover:border-slate-300">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left bg-white hover:bg-slate-50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-800 leading-snug">{item.question}</span>
        <ChevronIcon expanded={isExpanded} />
      </button>
      <div
        className={clsx(
          'grid transition-all duration-200 ease-in-out',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-3 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
            {item.answer}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FaqSection({
  title = '❓ 常见问题',
  categories = DEFAULT_CATEGORIES,
  items = DEFAULT_ITEMS,
  defaultExpanded = null,
  maxExpanded = 1,
  className,
}: FaqConfig) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(defaultExpanded ? [defaultExpanded] : [])
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    if (!activeCategory) return items;
    return items.filter(item => item.category === activeCategory);
  }, [items, activeCategory]);

  const handleToggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (maxExpanded > 0 && next.size >= maxExpanded) {
          const firstId = next.values().next().value;
          if (firstId) next.delete(firstId);
        }
        next.add(id);
      }
      return next;
    });
  };

  const groupedItems = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const cat of categories) {
      map.set(cat.key, []);
    }
    for (const item of filteredItems) {
      const list = map.get(item.category);
      if (list) list.push(item);
    }
    return map;
  }, [filteredItems, categories]);

  return (
    <div className={clsx('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-400">{filteredItems.length} 条</span>
      </div>

      {/* 分类筛选 */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={clsx(
            'px-3 py-1 rounded-full text-xs font-medium transition-all',
            !activeCategory
              ? 'bg-blue-100 text-blue-700'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          )}
        >
          全部
        </button>
        {categories.map(cat => {
          const count = items.filter(i => i.category === cat.key).length;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              className={clsx(
                'px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1',
                activeCategory === cat.key
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              )}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
              <span className="opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* FAQ 列表 */}
      <div className="space-y-2">
        {categories.map(cat => {
          const catItems = groupedItems.get(cat.key) || [];
          if (catItems.length === 0) return null;
          return (
            <div key={cat.key}>
              {activeCategory && (
                <div className="text-xs font-medium text-slate-500 mb-2 mt-3 first:mt-0">
                  {cat.icon} {cat.label}
                </div>
              )}
              {catItems.map(item => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedIds.has(item.id)}
                  onToggle={() => handleToggle(item.id)}
                />
              ))}
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="text-center py-6 text-sm text-slate-400">该分类下暂无问题</div>
      )}
    </div>
  );
}

export { DEFAULT_ITEMS, DEFAULT_CATEGORIES };
