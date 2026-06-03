export interface ClassRole {
  id: string;
  name: string;
  icon: string;
  category: 'leadership' | 'academic' | 'service' | 'activity' | 'general';
  description: string;
  promptHint: string;
  examples: string[];
}

export type RoleCategory = ClassRole['category'];

export const ROLE_CATEGORIES: Record<RoleCategory, { label: string; icon: string; color: string }> = {
  leadership: { label: '领导职务', icon: '👑', color: '#F59E0B' },
  academic: { label: '学习职务', icon: '📚', color: '#3B82F6' },
  service: { label: '服务职务', icon: '🛡️', color: '#10B981' },
  activity: { label: '文体职务', icon: '🎨', color: '#EC4899' },
  general: { label: '普通同学', icon: '👤', color: '#6B7280' },
};

export const CLASS_ROLES: ClassRole[] = [
  {
    id: 'class_monitor',
    name: '班长',
    icon: '👑',
    category: 'leadership',
    description: '班级核心管理者，统筹协调班级事务',
    promptHint: '该生担任班长职务，评语应体现其领导力、统筹协调能力、公正担当的品质，以及以身作则的模范作用。可提及组织活动、协调同学矛盾、带动班级氛围、成为老师得力助手等具体表现。',
    examples: [
      '作为班长，你是班级的"主心骨"',
      '总能敏锐察觉班级需求，有条不紊地处理各项事务',
      '以身作则遵守纪律，用热情带动班级氛围',
      "群雁高飞头雁领，一枝独秀不是春",
    ],
  },
  {
    id: 'study_commissar',
    name: '学习委员',
    icon: '📚',
    category: 'academic',
    description: '学风建设带头人，营造良好学习氛围',
    promptHint: '该生担任学习委员，评语应突出其学业榜样作用、乐于分享的精神、在学风建设中的贡献。可提及自身成绩优异且不吝分享、主动整理知识点、解答同学疑问、带动勤学好问的氛围等表现。',
    examples: [
      '你是班级的"学习标杆"',
      '自身成绩优异却从不吝啬分享',
      '协助老师落实教学任务，带动大家形成勤学好问的氛围',
      '"授人以鱼，不如授人以渔"，你的笔记就是班级的范本',
    ],
  },
  {
    id: 'discipline_commissar',
    name: '纪律委员',
    icon: '📋',
    category: 'service',
    description: '维护课堂秩序和班级纪律',
    promptHint: '该生担任纪律委员，评语应肯定其原则性、责任感及自我约束能力。可提及自身严于律己、对待纪律公正严明、温和而坚定地提醒同学遵守规则、为大家营造专注高效的学习环境等。',
    examples: [
      '你是班级的"秩序守护者"',
      '自身严于律己，对待纪律公正严明',
      '用耐心化解矛盾，用原则守护秩序',
      '连考勤都记得分毫不差，却从不会"板着脸"',
    ],
  },
  {
    id: 'hygiene_commissar',
    name: '卫生委员',
    icon: '🧹',
    category: 'service',
    description: '负责班级卫生和环境管理',
    promptHint: '该生担任卫生委员，评语应强调其细致入微、亲力亲为的品质和对班级环境的责任心。可提及日常清扫细致入微、坚持培养大家的卫生习惯、让整洁舒适的环境成为班级福利等。',
    examples: [
      '你是班级的"环境守护者"',
      '对班级卫生事事上心，细致入微、亲力亲为',
      '用双手擦亮教室的每一处角落',
      '好几次看见你放学都会检查卫生死角，这份"眼里有活"的细致是你的宝藏',
    ],
  },
  {
    id: 'subject_rep',
    name: '课代表',
    icon: '📝',
    category: 'academic',
    description: '学科与老师之间的桥梁纽带',
    promptHint: '该生担任课代表（科代表），评语应聚焦其作为学科桥梁的作用：按时收发作业、及时反馈同学疑问、落实老师教学安排、用热情点燃大家对学科的兴趣、分享实用学习方法等。',
    examples: [
      '你是学科学习的"桥梁纽带"',
      '从不要老师提醒，按时认真收发作业',
      '及时反馈同学疑问，用细致落实老师的教学安排',
      '深耕本学科知识，总能分享实用的学习方法',
    ],
  },
  {
    id: 'arts_commissar',
    name: '文艺委员',
    icon: '🎨',
    category: 'activity',
    description: '组织班级文艺和文化活动',
    promptHint: '该生担任文艺委员，评语应关注其在丰富班级生活、提升审美情趣方面的贡献。可提及组织文艺活动的创造力、为班级文化增添色彩、带动同学们参与文化活动等。',
    examples: [
      '你是班级文化的"调色师"和"活力源"',
      '每次班级活动都因你的策划而精彩纷呈',
      '用创意和热情点亮了班级的文化生活',
      '你的组织能力让全班同学都能展示自己的才艺',
    ],
  },
  {
    id: 'sports_commissar',
    name: '体育委员',
    icon: '⚽',
    category: 'activity',
    description: '组织体育活动和带领锻炼',
    promptHint: '该生担任体育委员，评语应体现其运动引领作用和组织体育活动的能力。可提及带头参与体育锻炼、组织体育比赛或课间活动、激发同学们的运动热情等。',
    examples: [
      '你是班级运动的"领跑者"',
      '每次体育活动都有你忙碌的身影',
      '用自己的活力带动全班同学参与体育锻炼',
      '组织有序、号召力强，是老师的好帮手',
    ],
  },
  {
    id: 'labor_commissar',
    name: '劳动委员',
    icon: '🔧',
    category: 'service',
    description: '组织和安排班级劳动任务',
    promptHint: '该生担任劳动委员，评语应突出其吃苦耐劳、服务奉献的精神。可提及认真安排每次值日、身先士卒参与劳动、培养同学们的劳动习惯等。',
    examples: [
      '你是班级劳动的"排头兵"',
      '每次大扫除都冲在最前面',
      '任劳任怨，从不计较个人得失',
      '用实际行动诠释了什么是责任与担当',
    ],
  },
  {
    id: 'group_leader',
    name: '组长',
    icon: '👥',
    category: 'leadership',
    description: '小组负责人，协调组内学习和活动',
    promptHint: '该生担任小组长，评语应关注其团队协作能力和小组管理责任感。可提及协调组员关系、组织小组讨论和活动、关心帮助组内同学、在团队合作中发挥积极作用等。',
    examples: [
      '你是小组的"粘合剂"',
      '总能把组员们凝聚在一起',
      '不仅自己表现出色，还带动全组共同进步',
      '细心负责，每个组员的情况你都了如指掌',
    ],
  },
  {
    id: 'ordinary_student',
    name: '普通同学',
    icon: '👤',
    category: 'general',
    description: '未担任特定职务的学生',
    promptHint: '',
    examples: [],
  },
];

export function getRolesByCategory(category: RoleCategory): ClassRole[] {
  return CLASS_ROLES.filter((role) => role.category === category);
}

export function getRoleById(id: string): ClassRole | undefined {
  return CLASS_ROLES.find((role) => role.id === id);
}

export function getSelectableRoles(): ClassRole[] {
  return CLASS_ROLES.filter((role) => role.id !== 'ordinary_student');
}
