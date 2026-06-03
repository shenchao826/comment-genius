// 评语模板库
// 提供不同类型、风格、长度的评语示例
// 可用于：展示样例、AI生成参考、新手教师学习

export interface CommentTemplate {
  id: string;
  type: CommentType;
  style: StyleType;
  length: LengthType;
  title: string;
  content: string;
  usage: string; // 适用场景
  tags: string[];
}

type CommentType = 
  | 'summary'        // 期末总结
  | 'encouragement'   // 日常鼓励
  | 'improvement'    // 改进建议
  | 'parent';        // 家长沟通

type StyleType = 
  | 'gentle'         // 温和鼓励
  | 'formal'         // 正式严谨
  | 'humorous';      // 幽默亲切

type LengthType = 
  | 'concise'        // 精简版 (80-120字)
  | 'standard'       // 标准版 (200-300字)
  | 'detailed';      // 详细版 (400-500字)


// ============================================
// 📚 模板库
// ============================================

export const COMMENT_TEMPLATES: CommentTemplate[] = [

  // ========== 温和鼓励 + 标准长度 ==========
  {
    id: 'template_001',
    type: 'encouragement',
    style: 'gentle',
    length: 'standard',
    title: '勤奋好学型学生',
    content: `该生在本学期表现优异，给老师留下了深刻印象。他/她学习态度端正，课堂上总是全神贯注地听讲，认真做好笔记。作业完成质量高，书写工整，正确率令人满意。

在数学学科上展现出较强的逻辑思维能力，解题思路清晰；语文方面，阅读面广，作文有自己独特的见解。更值得称赞的是，他/她乐于助人，经常主动帮助同学解决学习上的困难，是老师得力的小助手。

希望继续保持这份对学习的热情，相信未来一定能取得更加辉煌的成绩！`,
    usage: '适用于成绩中等偏上、态度认真的学生',
    tags: ['勤奋', '助人', '全科均衡']
  },

  {
    id: 'template_002',
    type: 'encouragement',
    style: 'gentle',
    length: 'standard',
    title: '进步明显型学生',
    content: `这学期，我欣喜地看到了该生的显著进步！从开学初期的有些不适应，到现在的渐入佳境，他/她付出了很多努力。

特别是在{subject}学科上，从原来的及格边缘提升到了良好水平，这种进步来之不易。课堂上开始主动举手发言了，虽然有时答案还不够准确，但这种积极参与的精神非常可贵。作业也能按时完成了，虽然偶尔还有小马虎现象，但整体趋势向好。

孩子，你的努力老师都看在眼里。记住：只要坚持不懈，就没有克服不了的困难。期待你下学期更大的突破！`,
    usage: '适用于有明显进步但基础仍需巩固的学生',
    tags: ['进步', '积极', '需鼓励']
  },

  // ========== 正式严谨 + 详细版 ==========
  {
    id: 'template_003',
    type: 'summary',
    style: 'formal',
    length: 'detailed',
    title: '期末综合评价（优秀）',
    content: `【思想品德方面】
该生思想端正，品行优良，能够严格遵守《中学生日常行为规范》。尊敬师长，团结同学，集体荣誉感强。积极参加班级和学校组织的各项活动，表现出良好的公民素养。

【学业表现】
本学期学习成绩总体优秀，各科发展较为均衡。
- 语文：基础知识扎实，阅读理解能力强，写作水平稳步提高，多次在班级作文展示中获奖；
- 数学：逻辑思维敏捷，计算能力突出，能够灵活运用所学知识解决实际问题；
- 英语：词汇量丰富，口语表达流畅，在英语角活动中表现活跃；
- 科学：实验操作规范，探究意识强，小论文撰写有深度。

【学习能力】
具备较强的自主学习能力，善于总结归纳学习方法。课堂专注度高，笔记条理清晰。遇到困难能主动请教老师和同学，具有钻研精神。

【不足与建议】
建议在时间管理方面进一步优化，避免在某些科目上花费过多时间而影响其他学科的平衡发展。同时可以适当增加课外阅读量，拓宽知识视野。

【总体评价】
该生是一位品学兼优的好学生，希望继续发扬优点，争取在下学期取得更加全面的发展。`,
    usage: '适用于学期末正式评价，成绩优秀学生',
    tags: ['全面', '优秀', '正式']
  },

  // ========== 幽默亲切 + 精简版 ==========
  {
    id: 'template_004',
    type: 'parent',
    style: 'humorous',
    length: 'concise',
    title: '家长沟通（轻松愉快风）',
    content: `{student_name}的爸爸妈妈：

好消息！您家宝贝这学期表现相当不错👍

✨ 亮点一：课堂"抢答王"——手举得比谁都快！
✨ 亮点二：作业"颜值担当"——字写得那叫一个漂亮！
✨ 亮点三：同学中的"人气王"——人缘好到爆！

当然啦，也有个小毛病：偶尔会犯"粗心鬼"，把3看成8😅

总体来说，这是个让老师省心的好孩子。咱们一起加油，期待他/她越来越棒！`,
    usage: '家长会或微信群轻松交流',
    tags: ['活泼', '可爱', '家长友好']
  },

  // ========== 改进建议 + 温和版 ==========
  {
    id: 'template_005',
    type: 'improvement',
    style: 'gentle',
    length: 'standard',
    title: '需要关注的学生',
    content: `该生是一个聪明可爱的孩子，但本学期在学习上遇到了一些挑战，需要我们共同关注和帮助。

**做得好的地方：**
- 性格开朗，和同学相处融洽
- 在感兴趣的领域（如体育/美术）表现出色
- 课堂纪律基本遵守

**需要努力的方面：**
1. **学习主动性有待加强**：有时需要老师的督促才能完成作业
2. **基础知识需要夯实**：部分知识点掌握不够牢固，容易遗忘
3. **注意力需要集中**：上课偶尔会出现走神的情况

**给家长的建议：**
建议在家中为孩子创造一个安静的学习环境，减少干扰因素。每天固定时间复习当天内容，养成预习和复习的好习惯。多给予鼓励，少一些批评，帮助孩子建立自信心。

**老师的话：**
其实这个孩子潜力很大，只是还没有找到适合自己的学习方法。让我们一起帮助他/她找到学习的乐趣吧！我相信，只要方法得当，他/她一定能够迎头赶上！`,
    usage: '适用于成绩下滑或学习困难的学生',
    tags: ['需关注', '潜力大', '家校配合']
  },

  // ========== 更多实用模板 ==========
  
  {
    id: 'template_006',
    type: 'summary',
    style: 'formal',
    length: 'standard',
    title: '中等生综合评价',
    content: `该生本学期表现中规中矩，各方面发展较为平稳。

在学习方面，能够按时完成作业，但作业质量有起伏。课堂表现尚可，但参与度不够高，较少主动发言。考试成绩维持在班级中等水平，没有明显的偏科现象。

品德方面，该生待人诚恳，尊敬师长，能与同学和睦相处。遵守校规校纪，无违纪记录。

建议：希望在今后的学习中能够更加积极主动，敢于提问和表达自己的观点。同时要注重学习方法的改进，提高学习效率。相信通过努力，一定能够取得更好的成绩。`,
    usage: '适用于大多数普通学生',
    tags: ['平稳', '中规中矩', '可提升']
  },

  {
    id: 'template_007',
    type: 'encouragement',
    style: 'gentle',
    length: 'concise',
    title: '简短鼓励（用于批改作业）',
    content: `字迹工整 ✍️ 态度认真 👍 继续保持！你是最棒的！💪`,
    usage: '作业评语、简单表扬',
    tags: ['简洁', '快速', '正面']
  }
];


// ============================================
// 🔧 工具函数
// ============================================

// 根据类型获取模板
export function getTemplatesByType(type: CommentType): CommentTemplate[] {
  return COMMENT_TEMPLATES.filter(t => t.type === type);
}

// 根据风格获取模板
export function getTemplatesByStyle(style: StyleType): CommentTemplate[] {
  return COMMENT_TEMPLATES.filter(t => t.style === style);
}

// 根据长度获取模板
export function getTemplatesByLength(length: LengthType): CommentTemplate[] {
  return COMMENT_TEMPLATES.filter(t => t.length === length);
}

// 随机推荐模板
export function recommendTemplate(
  type?: CommentType, 
  style?: StyleType,
  length?: LengthType
): CommentTemplate | null {
  let filtered = [...COMMENT_TEMPLATES];
  
  if (type) filtered = filtered.filter(t => t.type === type);
  if (style) filtered = filtered.filter(t => t.style === style);
  if (length) filtered = filtered.filter(t => t.length === length);
  
  if (filtered.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
}

// 获取所有可用类型
export function getAvailableTypes(): CommentType[] {
  return [...new Set(COMMENT_TEMPLATES.map(t => t.type))];
}

// 获取所有可用风格
export function getAvailableStyles(): StyleType[] {
  return [...new Set(COMMENT_TEMPLATES.map(t => t.style))];
}
