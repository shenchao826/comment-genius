/**
 * Teachers (评语助手) Design Token System
 *
 * 来源：TEACHERS_PRODUCT_SPEC.md §5.1 Design Token 系统（完整）
 * 品牌人格：专业 · 高效 · 有温度 · 可信赖
 * 设计原则：不像灵犀的神秘感（紫色），不像企业SaaS的冷冰冰（灰白蓝）
 *
 * 使用方式：
 * import { colors, fonts, spacing, radii, shadows } from '@/config/design-tokens';
 * className={`bg-white border ${colors.border.default} ${fonts.size.base}`}
 */

// ==================== 5.1.1 色彩令牌 ====================

export const colors = {
  // 主色系 — 蓝色（信任+专业）
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // hover态
    600: '#2563EB', // ★ 主按钮/重要操作
    700: '#1D4ED8', // 按下(active)
    800: '#1E40AF', // 标题文字(深蓝)
    900: '#1E3A8A', // 超深标题
  },

  // 中性色系 — Slate（文字+边框）
  slate: {
    50: '#F8FAFC', // 卡片内部背景
    100: '#F1F5F9', // 分割线/次要边框
    200: '#E2E8F0', // 输入框边框
    300: '#CBD5E1', // 禁用态边框
    400: '#94A3B8', // 占位符文字
    500: '#64748B', // ★ 次要说明文字
    600: '#475569', // 辅助标签文字
    700: '#334155', // 正文强调
    800: '#1E293B', // ★ 正文主色
    900: '#0F172A', // 标题/H1
  },

  // 语义色
  success: {
    DEFAULT: '#059669',
    light: '#D1FAE5',
  },
  warning: {
    DEFAULT: '#D97706',
    light: '#FEF3C7',
  },
  error: {
    DEFAULT: '#DC2626',
    light: '#FEE2E2',
  },
  info: {
    DEFAULT: '#0284C7',
    light: '#CFFAFE',
  },

  // 特殊用途色
  premium: '#F59E0B', // 付费/高级功能标识（琥珀金）
  premiumLight: '#FEF3C7', // 付费功能背景
  free: '#10B981', // 免费标识（绿色）
  watermark: '#94A3B8', // 水印文字颜色（40%透明度）

  // 背景色
  bg: {
    primary: '#FFFFFF', // 主背景（白色卡片）
    secondary: '#F8FAFC', // 页面背景（slate-50）
    tertiary: '#F1F5F9', // 第三级背景
  },
} as const;

// ==================== 5.1.2 排版令牌 ====================

export const fonts = {
  // 字体族
  family: {
    sans: "'Inter', 'PingFang SC', 'Microsoft YaHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Consolas', 'Monaco', monospace",
    serif: "'Noto Serif SC', 'Source Han Serif SC', 'SimSun', serif",
  },

  // 字号阶梯（基于1.25 Major Third比例）
  size: {
    xs: { value: '12px', lineHeight: '16px', weight: 400, tracking: 0 }, // 极小辅助
    sm: { value: '14px', lineHeight: '20px', weight: 400, tracking: 0 }, // 次级文字
    base: { value: '16px', lineHeight: '24px', weight: 400, tracking: 0 }, // ★ 正文
    lg: { value: '18px', lineHeight: '28px', weight: 500, tracking: 0 }, // 小标题
    xl: { value: '20px', lineHeight: '28px', weight: 500, tracking: 0 }, // 中标题
    '2xl': { value: '24px', lineHeight: '32px', weight: 600, tracking: '-0.02em' }, // 大标题
    '3xl': { value: '30px', lineHeight: '36px', weight: 700, tracking: '-0.02em' }, // 展示标题
    '4xl': { value: '36px', lineHeight: '40px', weight: 700, tracking: '-0.03em' }, // 落地页大标语
  },

  // 评语正文专用（衬线体 + 更大字号）
  commentBody: {
    fontFamily: "'Noto Serif SC', serif",
    size: { mobile: '16px', desktop: '17px' },
    lineHeight: 1.8,
    letterSpacing: '0.02em',
    color: '#1E293B', // slate-800
  },
} as const;

// ==================== 5.1.3 间距令牌 ====================

export const spacing = {
  0: '0px',
  1: '4px', // 紧凑元素内间距
  2: '8px', // 图标与文字间距
  3: '12px', // 相关联元素组间距
  4: '16px', // ★ 默认卡片内边距
  5: '20px', // section内部间距
  6: '24px', // 卡片之间的垂直间距
  8: '32px', // 页面section之间间距
  10: '40px', // 大区块分隔
  12: '48px', // 页面底部留白
  16: '64px', // Hero区上下padding
  20: '80px', // 落地页大区间距
  24: '96px', // 仅用于超大方块
} as const;

// ==================== 5.1.4 圆角令牌 ====================

export const radii = {
  none: '0px', // 方形元素（输入框、代码块）
  sm: '4px', // 小元素内部圆角（tag/select option）
  md: '6px', // 卡片/面板
  lg: '8px', // ★ 默认按钮/输入框/下拉框
  xl: '12px', // 大卡片/模态框
  '2xl': '16px', // 对话框/通知toast
  full: '9999px', // 圆形元素（avatar/图标按钮）
} as const;

// ==================== 5.1.5 阴影令牌 ====================

export const shadows = {
  sm: '0 1px 2px rgba(0,0,0,0.05)', // 卡片悬浮态(轻)
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)', // ★ 默认卡片阴影
  lg: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)', // 弹窗/下拉菜单
  xl: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)', // Modal对话框
  inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)', // 按下状态(inset)
  glow: '0 0 0 3px rgba(37,99,235,0.15)', // 主按钮focus ring（蓝色光晕）
  glowError: '0 0 0 3px rgba(220,38,38,0.15)', // 错误input focus ring（红色光晕）
} as const;

// ==================== 5.1.6 动效令牌 ====================

export const motion = {
  duration: {
    instant: '100ms', // 点击反馈
    fast: '200ms', // 展开/收起、tooltip显示
    normal: '300ms', // 模态框进入/退出、页面切换
    slow: '500ms', // 复杂动画（骨架屏渐隐）
    slower: '800ms', // 首次入场动画
  },

  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    outExpo: 'cubic-bezier(0, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // 弹性效果（标签选中弹跳）
  },
} as const;

// ==================== 5.1.7 Z-Index层级令牌 ====================

export const zIndex = {
  base: 0, // 页面默认内容层
  sticky: 10, // Sticky header / 固定导航栏
  dropdown: 20, // Dropdown / Popover / Select 下拉
  toast: 30, // Toast 通知（顶部/底部浮动）
  overlay: 40, // Modal 遮罩背景
  modal: 50, // Modal 内容
  payment: 60, // 支付二维码弹窗（最高优先级）
} as const;

// ==================== 组件规格常量 ====================

export const components = {
  button: {
    height: { mobile: '48px', desktop: '44px' },
    paddingH: { mobile: '24px', desktop: '32px' },
    minWidth: '120px',
    iconGap: '8px',
    borderRadius: radii.lg,
  },

  input: {
    height: '46px', // 单行输入框高度
    minHeight: '80px', // Textarea最小高度
    maxHeight: '200px', // Textarea最大高度
    paddingX: '12px',
    paddingLeftWithIcon: '40px',
    borderWidth: '1.5px',
    fontSize: '16px', // 防止iOS自动缩放
  },

  tagChip: {
    dimensions: { width: 'auto', height: '40px' },
    padding: '6px 14px',
    iconSize: '16px',
    iconGap: '6px',
    maxSelections: 6, // 最大选择数量
  },

  styleSelector: {
    itemHeight: '52px', // 比普通按钮更高，方便点击
    gap: '8px',
  },

  card: {
    borderRadius: radii.xl,
    shadow: shadows.md,
    contentPadding: { mobile: '20px', desktop: '24px' },
    actionPadding: '16px',
  },

  modal: {
    maxWidth: '420px',
    width: '90%',
    padding: '24px',
    borderRadius: radii['2xl'],
    closeButton: { size: '32x32px', iconSize: '18px' },
  },

  toast: {
    minHeight: '44px',
    padding: '12px 20px',
    maxWidth: '380px',
    borderRadius: radii.lg,
    autoDismiss: 3000, // ms
  },
} as const;
