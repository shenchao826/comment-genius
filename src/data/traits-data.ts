// 学生特点标签数据库
// 用于评语生成时的特征选择

export interface Trait {
  id: string;
  name: string;
  icon: string;
  category: TraitCategory;
  description: string;
  positive?: boolean; // 正面/中性/需改进
  examples?: string[]; // 具体表现示例
}

export type TraitCategory = 
  | 'attitude'      // 学习态度
  | 'performance'   // 学习成绩
  | 'homework'      // 作业完成
  | 'relationship'  // 师生关系
  | 'creativity'    // 创新思维
  | 'responsibility' // 责任感
  | 'respectful'    // 懂礼貌
  | 'responsible'   // 负责任
  | 'cooperative'  // 团队合作
  | 'polite';       // 文明礼貌

export const TRAIT_CATEGORIES: Record<TraitCategory, { label: string; icon: string; color: string }> = {
  attitude: { label: '学习态度', icon: '📚', color: '#3B82F6' },
  performance: { label: '学习成绩', icon: '🎯', color: '#10B981' },
  homework: { label: '作业情况', icon: '✏️', color: '#F59E0B' },
  relationship: { label: '师生关系', icon: '🤝', color: '#8B5CF6' },
  creativity: { label: '创新思维', icon: '💡', color: '#EC4899' },
  responsibility: { label: '责任感', icon: '💪', color: '#EF4444' },
  respectful: { label: '尊敬师长', icon: '🙏', color: '#06B6D4' },
  responsible: { label: '责任心', icon: '✅', color: '#84CC16' },
  cooperative: { label: '团队合作', icon: '👥', color: '#F97316' },
  polite: { label: '文明礼貌', icon: '🌟', color: '#6366F1' }
};

export const TRAITS: Trait[] = [
  // ========== 学习态度 (5个) ==========
  {
    id: 'attitude_diligent',
    name: '勤奋刻苦',
    icon: '📖',
    category: 'attitude',
    description: '学习态度端正，从不迟到早退',
    positive: true,
    examples: ['上课认真听讲', '主动完成作业', '课后及时复习']
  },
  {
    id: 'attitude_active',
    name: '积极发言',
    icon: '🙋',
    category: 'attitude',
    description: '课堂参与度高，乐于表达观点',
    positive: true,
    examples: ['主动举手回答问题', '积极参与讨论']
  },
  {
    id: 'attitude_focused',
    name: '专注力强',
    icon: '🎯',
    category: 'attitude',
    description: '能够长时间集中注意力',
    positive: true,
    examples: ['做作业不分心', '听课不走神']
  },
  {
    id: 'attitude_curious',
    name: '求知欲强',
    icon: '❓',
    category: 'attitude',
    description: '对新鲜事物充满好奇，爱问为什么',
    positive: true,
    examples: ['经常提问', '喜欢探索未知领域']
  },
  {
    id: 'attitude_persistent',
    name: '坚持不懈',
    icon: '💪',
    category: 'attitude',
    description: '遇到困难不放弃，有毅力',
    positive: true,
    examples: ['难题肯钻研', '失败后继续努力']
  },

  // ========== 学习成绩 (5个) ==========
  {
    id: 'performance_excellent',
    name: '成绩优异',
    icon: '🏆',
    category: 'performance',
    description: '各科成绩稳定在优秀水平',
    positive: true,
    examples: ['考试名列前茅', '基础扎实']
  },
  {
    id: 'performance_improving',
    name: '进步明显',
    icon: '📈',
    category: 'performance',
    description: '近期成绩有明显提升',
    positive: true,
    examples: ['从及格到良好', '排名上升']
  },
  {
    id: 'performance_stable',
    name: '成绩稳定',
    icon: '📊',
    category: 'performance',
    description: '成绩波动小，发挥稳定',
    positive: true,
    examples: ['每次考试都在预期范围']
  },
  {
    id: 'performance_strong_subject',
    name: '学科特长',
    icon: '🎨',
    category: 'performance',
    description: '在某些科目上表现出色',
    positive: true,
    examples: ['数学思维好', '语文写作佳']
  },
  {
    id: 'performance_needs_help',
    name: '需要帮助',
    icon: '🆘',
    category: 'performance',
    description: '某些科目基础薄弱，需加强辅导',
    positive: false,
    examples: ['英语单词量不足', '数学计算易出错']
  },

  // ========== 作业情况 (4个) ==========
  {
    id: 'homework_neat',
    name: '书写工整',
    icon: '✍️',
    category: 'homework',
    description: '作业卷面整洁，字迹清晰',
    positive: true
  },
  {
    id: 'homework_timely',
    name: '按时完成',
    icon: '⏰',
    category: 'homework',
    description: '从不拖欠作业，时间观念强',
    positive: true
  },
  {
    id: 'homework_careful',
    name: '认真细致',
    icon: '🔍',
    category: 'homework',
    description: '作业错误率低，检查习惯好',
    positive: true
  },
  {
    id: 'homework_creative',
    name: '有创意',
    icon: '💭',
    category: 'homework',
    description: '作业中常有自己的想法和见解',
    positive: true
  },

  // ========== 师生关系 (3个) ==========
  {
    id: 'relationship_respectful',
    name: '尊师重道',
    icon: '🙇',
    category: 'relationship',
    description: '对老师有礼貌，尊重师长',
    positive: true
  },
  {
    id: 'relationship_communicative',
    name: '善于沟通',
    icon: '💬',
    category: 'relationship',
    description: '愿意与老师交流学习和生活问题',
    positive: true
  },
  {
    id: 'relationship_helpful',
    name: '乐于助人',
    icon: '🤝',
    category: 'relationship',
    description: '经常帮助同学和老师',
    positive: true
  },

  // ========== 创新思维 (3个) ==========
  {
    id: 'creativity_thinking',
    name: '思维活跃',
    icon: '🧠',
    category: 'creativity',
    description: '思考问题角度新颖，不拘泥于常规',
    positive: true
  },
  {
    id: 'creativity_hands_on',
    name: '动手能力强',
    icon: '🛠️',
    category: 'creativity',
    description: '喜欢实践操作，动手能力突出',
    positive: true
  },
  {
    id: 'creativity_artistic',
    name: '有艺术天赋',
    icon: '🎭',
    category: 'creativity',
    description: '在音乐、美术、体育等方面有特长',
    positive: true
  },

  // ========== 品德品质 (5个) ==========
  {
    id: 'responsibility_honest',
    name: '诚实守信',
    icon: '💎',
    category: 'responsible',
    description: '做人诚实，说到做到',
    positive: true
  },
  {
    id: 'respectful_polite',
    name: '文明有礼',
    icon: '🌸',
    category: 'respectful',
    description: '语言文明，举止得体',
    positive: true
  },
  {
    id: 'cooperative_teamwork',
    name: '团队精神',
    icon: '👫',
    category: 'cooperative',
    description: '善于与他人合作，有集体荣誉感',
    positive: true
  },
  {
    id: 'polite_friendly',
    name: '友善待人',
    icon: '😊',
    category: 'polite',
    description: '与同学相处融洽，人缘好',
    positive: true
  },
  {
    id: 'leadership_potential',
    name: '领导力',
    icon: '👑',
    category: 'cooperative',
    description: '有组织协调能力，能带动同学',
    positive: true
  }
];

// 根据类别获取标签
export function getTraitsByCategory(category: TraitCategory): Trait[] {
  return TRAITS.filter(trait => trait.category === category);
}

// 获取正面标签（用于鼓励型评语）
export function getPositiveTraits(): Trait[] {
  return TRAITS.filter(trait => trait.positive !== false);
}

// 获取需要改进的标签（用于改进建议型评语）
export function getImprovementTraits(): Trait[] {
  return TRAITS.filter(trait => trait.positive === false);
}

// 根据 ID 获取标签
export function getTraitById(id: string): Trait | undefined {
  return TRAITS.find(trait => trait.id === id);
}

// 获取所有分类
export function getAllCategories(): TraitCategory[] {
  return Object.keys(TRAIT_CATEGORIES) as TraitCategory[];
}

// 随机推荐标签（用于快速选择）
export function recommendTraits(count: number = 3): Trait[] {
  const positive = getPositiveTraits();
  const shuffled = positive.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
