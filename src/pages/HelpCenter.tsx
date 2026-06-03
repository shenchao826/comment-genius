import { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import SEO from '../components/SEO';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
}

interface Category {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const CATEGORIES: Category[] = [
  { key: 'getting-started', label: '快速上手', icon: '🚀', description: '从注册到生成第一条评语' },
  { key: 'features', label: '功能详解', icon: '⚙️', description: '各功能模块使用方法' },
  { key: 'data', label: '数据管理', icon: '📊', description: '导入、导出、隐私安全' },
  { key: 'ai', label: 'AI 评语技巧', icon: '🤖', description: '写出更好评语的秘诀' },
  { key: 'billing', label: '计费与会员', icon: '💰', description: '额度、升级、订阅管理' },
  { key: 'troubleshoot', label: '故障排查', icon: '🔧', description: '常见问题与解决方案' },
];

const ALL_ITEMS: FaqItem[] = [
  // ── 快速上手 ──
  { id: 'gs-1', question: '如何注册账号？', answer: '点击首页「登录」按钮，选择「没有账号？立即注册」，填写手机号或邮箱即可完成注册。支持微信扫码快捷登录。', category: 'getting-started', tags: ['注册', '登录'] },
  { id: 'gs-2', question: '第一次使用需要做什么？', answer: '登录后建议：① 创建班级 → ② 添加学生名单（可 Excel 批量导入）→ ③ 尝试为一名学生生成评语。整个过程约 3 分钟。', category: 'getting-started', tags: ['新手'] },
  { id: 'gs-3', question: '如何创建班级和管理学生？', answer: '进入「👥 学生管理」页面，点击「+ 新建班级」输入班级名称，然后通过手动添加或 Excel 导入批量添加学生信息。每个班级最多支持 200 名学生。', category: 'getting-started', tags: ['班级', '学生'] },

  // ── 功能详解 ──
  { id: 'feat-1', question: '评语生成的完整流程是什么？', answer: '① 输入学生姓名 → ② 选择特点标签（3-6 个效果最佳）→ ③ 选择角色类型（可选）→ ④ 选择评语风格/长度 → ⑤ 点击「✨ AI 生成」→ ⑥ 查看结果并可编辑调整 → ⑦ 复制或保存到历史记录。', category: 'features', tags: ['流程', '生成'] },
  { id: 'feat-2', question: '特点标签如何选择更有效？', answer: '建议遵循「3+2 原则」：3 个核心优点（如：学习认真、乐于助人、思维活跃）+ 2 个待改进方向（如：需提高专注力、多参与课堂互动）。这样生成的评语既有肯定又有建设性建议。', category: 'features', tags: ['标签', '技巧'] },
  { id: 'feat-3', question: '10 种班级角色有什么用？', answer: '班级角色影响 AI 对学生在集体中定位的理解。例如选择「班长」会侧重领导力和责任感，选择「文艺委员」会突出艺术特长。不选则 AI 根据特点自动推断。', category: 'features', tags: ['角色', '班级职位'] },
  { id: 'feat-4', question: '拍照识别成绩单怎么用？', answer: '在成绩录入区切换到「📷 拍照识别」Tab → 上传成绩单照片（JPG/PNG/WebP）→ 点击「🔍 开始AI识别」→ 系统自动提取成绩数据 → 核对修正后保存。支持单科和多科目成绩表。', category: 'features', tags: ['OCR', '识别', '成绩'] },
  { id: 'feat-5', question: '语音输入功能在哪里？', answer: '在「谈话记录」和「家访记录」的文本框下方有 🎤 语音输入按钮。点击后允许浏览器麦克风权限，对着麦克风说话即可实时转文字。推荐 Chrome 或 Edge 浏览器以获得最佳体验。', category: 'features', tags: ['语音', '转文字'] },
  { id: 'feat-6', question: '批量生成评语怎么做？', answer: '进入「批量生成」页面 → 选择班级 → 筛选要生成的学生（可全选）→ 统一设置评语参数 → 点击开始生成。系统会逐个为每位学生生成个性化评语，完成后可一键下载 CSV。', category: 'features', tags: ['批量', '效率'] },
  { id: 'feat-7', question: 'PDF 学情报告包含什么内容？', answer: '进入任意学生的详情页，找到「📄 学情报告」区域。报告包含：学生基本信息卡、成绩统计卡片（平均分/最高/最低）、各科成绩趋势表格、行为记录汇总、谈话与家访摘要、AI 综合评价及改进建议。', category: 'features', tags: ['PDF', '报告', '导出'] },

  // ── 数据管理 ──
  { id: 'data-1', question: '如何批量导入学生名单？', answer: '在学生管理页点击「📥 Excel 导入」，下载模板文件后按格式填写学生信息（姓名必填，学号/性别选填），上传后系统自动解析并创建学生档案。支持 .xlsx 和 .csv 格式。', category: 'data', tags: ['导入', 'Excel', '学生'] },
  { id: 'data-2', question: '数据可以导出吗？有哪些格式？', answer: '支持多种导出方式：\n• 单个学生详情 → CSV 格式\n• 班级汇总数据 → CSV 格式\n• 批量评语结果 → CSV 格式\n• 学情分析报告 → PDF 专业排版\n\n导出文件均可在 Excel/WPS 中打开编辑。', category: 'data', tags: ['导出', 'CSV', 'PDF'] },
  { id: 'data-3', question: '我的数据安全吗？', answer: '我们采用多重安全保障：\n① **传输加密**：全程 HTTPS/TLS 1.3\n② **存储加密**：AES-256-GCM 加密算法\n③ **访问控制**：教师账号数据完全隔离\n④ **审计日志**：所有操作均有记录可追溯\n⑤ **合规**：符合教育数据保护相关规范要求', category: 'data', tags: ['安全', '隐私', '加密'] },
  { id: 'data-4', question: '断网时能继续使用吗？', answer: '应用支持 PWA 离线模式。首次加载后会缓存核心资源，离线状态下可以：\n✅ 浏览已有学生数据和评语历史\n✅ 查看已加载的成绩和行为记录\n❌ 需联网的功能（如 AI 生成）会自动排队\n恢复网络后自动同步执行排队的操作。', category: 'data', tags: ['离线', 'PWA', '网络'] },

  // ── AI 评语技巧 ──
  { id: 'ai-1', question: '如何让 AI 写出更真实的评语？', answer: '关键在于**提供足够的数据上下文**：\n① 先录入该生的考试成绩（至少 2-3 次）\n② 补充行为记录（正向和负向都录）\n③ 记录 1-2 条谈话要点\n\n有了这些真实数据，AI 生成的评语会引用具体事例（如"数学期中考从78分提升至92分"），而非空泛套话。', category: 'ai', tags: ['技巧', '质量', '真实性'] },
  { id: 'ai-2', question: '不同评语风格有什么区别？', answer: '系统提供 4 种风格：\n• **正式规范** — 适合放入正式学籍档案，用语严谨\n• **亲切鼓励** — 适合期末发给家长，温暖正面\n• **客观中性** — 事实陈述为主，不带感情色彩\n• **简洁明了** — 一两句话概括核心，适合快速浏览\n\n建议根据使用场景灵活选择。', category: 'ai', tags: ['风格', '场景'] },
  { id: 'ai-3', question: '生成的评语不满意怎么办？', answer: '可以尝试以下方法：\n① 调整特点标签组合（换掉 1-2 个标签效果往往很明显）\n② 切换评语风格试试\n③ 在补充说明中写入具体要求（如"请重点提及数学进步"）\n④ 直接在生成结果上手动编辑修改\n⑤ 点击「重新生成」获取不同版本', category: 'ai', tags: ['优化', '重试'] },

  // ── 计费与会员 ──
  { id: 'bill-1', question: '免费版有什么限制？', answer: '免费版每日 **5 次** AI 生成额度（次日 00:00 重置），基础功能全部可用。限制仅体现在：\n❌ 批量生成不可用\n❌ PDF 报告不可用\n❌ 高级模板不可用\n日常单人评语生成完全够用。', category: 'billing', tags: ['免费', '限额'] },
  { id: 'bill-2', question: 'Pro 版有哪些特权？', answer: 'Pro 会员享受：\n✅ **无限次** AI 生成（不限时间不限数量）\n✅ 批量生成整班评语\n✅ PDF 学情专业报告\n✅ 全部高级评语模板\n✅ 优先客服响应\n✅ 新功能抢先体验\n\n按月/按年订阅均可，年付享 8 折优惠。', category: 'billing', tags: ['Pro', '会员', '升级'] },
  { id: 'bill-3', question: '如何查看剩余额度？', answer: '首页右侧显示当前额度和使用进度条。也可点击底部导航栏「⭐ 会员中心」查看详细信息，包括今日已用次数、历史用量统计等。', category: 'billing', tags: ['额度', '查询'] },

  // ── 故障排查 ──
  { id: 'fix-1', question: '生成评语时提示"网络错误"？', answer: '按顺序排查：\n① 检查网络连接是否正常\n② 刷新页面重试\n③ 清除浏览器缓存（Ctrl+Shift+Delete）\n④ 如果使用公司/学校网络，确认防火墙未拦截\n⑤ 尝试切换浏览器（推荐 Chrome 90+ 或 Edge 90+）', category: 'troubleshoot', tags: ['网络', '错误'] },
  { id: 'fix-2', question: '提示"登录已过期"怎么办？', answer: '这是正常的安全机制（会话有效期约 24 小时）。解决步骤：\n① 点击任意需要登录的功能\n② 自动跳转到登录页面\n③ 重新输入密码登录\n④ 登录后自动返回之前操作的页面\n之前的所有数据都不会丢失。', category: 'troubleshoot', tags: ['登录', '过期'] },
  { id: 'fix-3', question: '语音输入无法使用？', answer: '常见原因及解决：\n① 浏览器不支持 → 请使用 Chrome 或 Edge\n② 麦克风权限被拒 → 点击地址栏左侧图标，允许麦克风权限\n③ 输入法冲突 → 切换到英文输入模式后再点语音按钮\n④ 麦克风硬件故障 → 检查设备管理器中麦克风是否正常工作', category: 'troubleshoot', tags: ['语音', '浏览器', '权限'] },
  { id: 'fix-4', question: 'OCR 识别不准确怎么办？', answer: '提高识别率的技巧：\n① 确保照片清晰，文字无模糊\n② 正对拍摄，避免倾斜或反光\n③ 裁剪到只包含成绩区域\n④ 如果是打印件，确保光线均匀\n⑤ 识别后务必人工核对数据再保存\n\n目前对标准表格类成绩单识别率最高（>95%）。', category: 'troubleshoot', tags: ['OCR', '识别', '准确率'] },
  { id: 'fix-5', question: '页面显示异常或白屏？', answer: '尝试以下修复步骤：\n① 强制刷新：Ctrl+F5（Mac: Cmd+Shift+R）\n② 清除缓存：设置 → 隐私 → 清除浏览数据\n③ 检查浏览器版本：Chrome/Edge 需 90 以上\n④ 禁用可能冲突的浏览器扩展（广告拦截器等）\n⑤ 如仍无法解决，请联系技术支持并提供截图', category: 'troubleshoot', tags: ['显示', '白屏', '兼容性'] },
];

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg className={clsx('w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0', expanded && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    let items = ALL_ITEMS;

    if (activeCategory) {
      items = items.filter(item => item.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }

    return items;
  }, [searchQuery, activeCategory]);

  const handleToggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const highlightText = (text: string): React.ReactNode => {
    if (!searchQuery.trim()) return text;

    const parts = text.split(new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 rounded px-0.5">{part}</mark>
        : part
    );
  };

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, FaqItem[]>();
    for (const cat of CATEGORIES) {
      map.set(cat.key, []);
    }
    for (const item of filteredItems) {
      const list = map.get(item.category);
      if (list) list.push(item);
    }
    return map;
  }, [filteredItems]);

  return (
    <>
      <SEO title="帮助中心" description="评语助手使用指南、常见问题解答与故障排除" />

      <div className="max-w-4xl mx-auto px-4 py-8 pb-32">
        {/* 页头 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">📚 帮助中心</h1>
          <p className="text-sm text-slate-500">找不到答案？<a href="#" className="text-blue-600 hover:underline">联系技术支持</a></p>
        </div>

        {/* 搜索栏 */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <SearchIcon />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索问题...（如：OCR、语音、导出）"
            className="w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl bg-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">
              ✕ 清除
            </button>
          )}
        </div>

        {/* 分类导航 */}
        {!searchQuery.trim() && (
          <div className="mb-8">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={clsx(
                  'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all',
                  !activeCategory ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                )}
              >
                📋 全部 ({ALL_ITEMS.length})
              </button>
              {CATEGORIES.map(cat => {
                const count = ALL_ITEMS.filter(i => i.category === cat.key).length;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
                    className={clsx(
                      'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                      activeCategory === cat.key
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-blue-300'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span className={clsx('text-xs opacity-70', activeCategory === cat.key && 'opacity-80')}>({count})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 搜索结果提示 */}
        {searchQuery.trim() && (
          <div className="mb-4 text-sm text-slate-500">
            找到 <span className="font-semibold text-slate-700">{filteredItems.length}</span> 条与「{searchQuery}」相关的问题
          </div>
        )}

        {/* FAQ 列表 */}
        <div className="space-y-6">
          {(activeCategory || !searchQuery.trim())
            ? CATEGORIES.filter(cat => !activeCategory || cat.key === activeCategory).map(cat => {
                const items = groupedByCategory.get(cat.key) || [];
                if (items.length === 0) return null;

                return (
                  <section key={cat.key}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{cat.icon}</span>
                      <h2 className="text-base font-semibold text-slate-800">{cat.label}</h2>
                      <span className="text-xs text-slate-400">— {cat.description}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map(item => (
                        <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-slate-300 transition-colors">
                          <button
                            type="button"
                            onClick={() => handleToggle(item.id)}
                            className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                          >
                            <span className="text-sm font-medium text-slate-800 leading-snug">{highlightText(item.question)}</span>
                            <ChevronIcon expanded={expandedId === item.id} />
                          </button>
                          <div className={clsx('grid transition-all duration-200 ease-in-out', expandedId === item.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                            <div className="overflow-hidden">
                              <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 whitespace-pre-line">
                                {highlightText(item.answer)}
                              </div>
                              {item.tags && item.tags.length > 0 && (
                                <div className="px-5 pb-3 flex gap-1.5 flex-wrap">
                                  {item.tags.map(tag => (
                                    <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })
            : filteredItems.map(item => (
                <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-slate-300 transition-colors">
                  <button
                    type="button"
                    onClick={() => handleToggle(item.id)}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-800 leading-snug">{highlightText(item.question)}</span>
                    <ChevronIcon expanded={expandedId === item.id} />
                  </button>
                  <div className={clsx('grid transition-all duration-200 ease-in-out', expandedId === item.id ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                    <div className="overflow-hidden">
                      <div className="px-5 pb-4 pt-1 text-sm text-slate-600 leading-relaxed border-t border-slate-100 whitespace-pre-line">
                        {highlightText(item.answer)}
                      </div>
                      <div className="px-5 pb-3 flex gap-1.5 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                          {CATEGORIES.find(c => c.key === item.category)?.icon} {CATEGORIES.find(c => c.key === item.category)?.label}
                        </span>
                        {item.tags?.map(tag => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          }

          {filteredItems.length === 0 && (
            <div className="text-center py-16">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-slate-500 font-medium mb-1">未找到相关问题</p>
              <p className="text-sm text-slate-400">试试其他关键词，或者浏览上方分类</p>
              <button type="button" onClick={() => { setSearchQuery(''); setActiveCategory(null); }} className="mt-4 text-sm text-blue-600 hover:underline">
                重置筛选
              </button>
            </div>
          )}
        </div>

        {/* 底部反馈区 */}
        <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl text-center">
          <p className="text-base font-medium text-slate-800 mb-1">没有找到答案？</p>
          <p className="text-sm text-slate-500 mb-4">我们的技术团队随时为您服务</p>
          <div className="flex justify-center gap-3">
            <a href="#" className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              💬 在线客服
            </a>
            <a href="#" className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-slate-700 text-sm rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              📧 提交工单
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
