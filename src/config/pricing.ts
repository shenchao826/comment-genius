/**
 * Teachers (评语助手) 定价配置
 * 来源：TEACHERS_PRODUCT_SPEC.md 6.1节 完整价格表
 * 日期：2026-06-01
 */

export const TEACHERS_PLANS = {
  free: {
    id: 'free',
    name: '免费版',
    price: 0,
    priceUSD: 0,
    durationDays: 0,
    description: '5条评语/天、1种风格、标准长度、无批量',
    features: ['每日 5 次生成', '基础评语风格', '标准字数(100-300字)', '单条生成模式', '社区支持'],
    badge: null,
    cta: '当前方案',
    popular: false,
  },
  single_comment: {
    id: 'single_comment',
    name: '高级评语·单条',
    price: 1.9, // CNY
    priceUSD: 0.27, // USD (≈¥1.9×0.14)
    durationDays: 0, // 一次性消费
    description: '单条高质量评语(qwen-plus模型)、更长更个性',
    features: [
      'qwen-plus 高级模型',
      '详细评语(300-500字)',
      '更多语气风格选项',
      '无广告体验',
      '即时生成',
    ],
    badge: '性价比之选',
    cta: '¥1.9 立即购买',
    popular: false,
  },
  bulk_class: {
    id: 'bulk_class',
    name: '期末全班包',
    price: 9.9, // CNY
    priceUSD: 1.39, // USD (≈¥9.9×0.14)
    durationDays: 7, // 7天内有效
    description: '批量生成全班40条评语（一次性）',
    features: [
      '批量生成40条评语',
      'Excel导入学生名单',
      '一键导出Word/PDF',
      '7天有效期内无限修改',
      '优先客服通道',
    ],
    badge: '期末必备',
    cta: '¥9.9 立即购买',
    popular: true, // 期末高峰期热门
  },
  monthly: {
    id: 'monthly',
    name: '专业版·月付',
    price: 25, // CNY（规格书明确¥25/月）
    priceUSD: 3.5, // USD (≈¥25×0.14)
    durationDays: 30,
    description: '全部功能解锁',
    features: [
      '无限次评语生成',
      '全部AI模型(qwen-plus)',
      '批量处理功能',
      '历史记录永久保存',
      '高级模板库',
      '学情简报功能',
      '优先客服支持',
    ],
    badge: null,
    cta: '¥25/月 订阅',
    popular: false,
  },
  yearly: {
    id: 'yearly',
    name: '专业版·年付',
    price: 168, // CNY（规格书明确¥168/年，月均¥14）
    priceUSD: 23.52, // USD (≈¥168×0.14)
    durationDays: 365,
    description: '全部功能 + 学情简报 + 优先客服',
    features: [
      '月均仅 ¥14（省33%）',
      '包含月付所有功能',
      '学情简报生成',
      '专属客户经理',
      '新功能抢先体验',
      '年度数据报告',
    ],
    badge: '最划算 · 省33%',
    cta: '¥168/年 订阅',
    popular: false,
  },
} as const;

export type TeachersPlanId = keyof typeof TEACHERS_PLANS;

/**
 * 虎皮椒商品名称映射
 * 格式: "评语助手-{套餐名称}"
 */
export const HUPIJIAO_PRODUCT_NAMES: Record<TeachersPlanId, string> = {
  free: '评语助手-免费版',
  single_comment: '评语助手-高级评语单条',
  bulk_class: '评语助手-期末全班包',
  monthly: '评语助手-专业版月度会员',
  yearly: '评语助手-专业版年度会员',
};

/**
 * 价格表（用于前端展示）
 */
export const PRICING_TABLE = [
  {
    sku: 'free',
    name: '免费版',
    price: '¥0',
    period: '',
    target: '所有用户',
    benefits: ['5条评语/天', '1种风格', '标准长度', '无批量'],
  },
  {
    sku: 'single_comment',
    name: '高级评语·单条',
    price: '¥1.9',
    period: '/条',
    target: '偶尔使用者',
    benefits: ['qwen-plus模型', '更长更个性', '多风格选择'],
  },
  {
    sku: 'bulk_class',
    name: '期末全班包',
    price: '¥9.9',
    period: '/次',
    target: '期末急需者',
    benefits: ['批量40条', 'Excel导入', '导出Word/PDF'],
  },
  {
    sku: 'monthly',
    name: '专业版·月付',
    price: '¥25',
    period: '/月',
    target: '重度使用者',
    benefits: ['全部功能解锁', '无限生成', '批量+模板'],
  },
  {
    sku: 'yearly',
    name: '专业版·年付',
    price: '¥168',
    period: '/年',
    target: '长期使用者',
    benefits: ['全部功能', '学情简报', '优先客服', '月均¥14'],
  },
  {
    sku: 'school',
    name: '学校版',
    price: '面议',
    period: '',
    target: '学校采购',
    benefits: ['多教师协作', '校长看板', '私有部署'],
  },
] as const;
