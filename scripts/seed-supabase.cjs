const SUPABASE_URL = 'https://olpydahwosyevsonzwtps.supabase.co/rest/v1/kb_documents';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9scHlkYWh3b3N5ZXZzb256d3RwcyIsIm9yZyI6InNoZW5jaGFvODI2IiwiaWF0IjoxNzM4OTg3MjAwfQ.-D6bOqMm2H1pVoXkA0oKXF8LYaBN7jBVLkVnI2XAQsE';

const SEED_DATA = [
  {
    title: '小学低段数学正面评语-学习兴趣与计算能力',
    content_type: 'teacher_comment_math',
    content: [
      '该生在数学学习上展现出浓厚的兴趣，课堂上总是积极举手发言。在计算方面准确率较高，特别是两位数加减法已经掌握得相当熟练。建议今后在解决实际应用题时，多练习口头表达自己的解题思路。',
      '这位同学对数字有着天然的敏感度，能够快速心算出结果。作业书写工整，步骤清晰可见。但在遇到较复杂的混合运算时偶尔会粗心出错，希望今后养成检查的好习惯。',
      '本学期以来，该生数学成绩稳步提升。从最初对应用题的畏难情绪到如今能独立分析题意、列出算式，进步明显。几何图形的识别能力也在不断增强，能准确辨认各种平面图形并说出它们的特征。',
      '该生思维活跃，经常能在课堂上提出独特的解题方法，让老师和同学耳目一新。口算速度在全班名列前茅。建议在书写时更加注意数字的规范性，避免因潦草导致的计算失误。',
      '在小组合作学习中，该生表现出色，不仅自己能快速完成任务，还乐于帮助组内其他同学理解题目。这种团队精神值得表扬！希望今后继续保持这份热情，同时也要注意倾听他人的不同解法。',
    ].join('\n\n')
  },
  {
    title: '小学高段语文改进建议-作文与阅读',
    content_type: 'teacher_comment_chinese',
    content: [
      '该生语文基础扎实，字词积累较为丰富，课文朗读流利有感情。但在作文写作方面存在明显不足——常常出现"开头好、中间空"的情况，即开篇精彩但后续内容单薄。建议每天坚持写100字的日记练习，重点训练如何围绕中心句展开具体事例描写。',
      '阅读理解能力有待加强。该生在完成课后习题时，对于需要归纳主旨大意或推断作者意图的题目正确率偏低。建议在课外阅读时有意识地做批注——在段落旁边写下自己的理解和疑问，培养深度思考的习惯。',
      '书写速度偏慢是制约该生语文成绩提升的一个因素。考试时经常因为写不完作文而失分。建议利用课余时间进行限时书写训练，从抄写一段200字的文章开始，逐步提高书写的流畅度和速度。',
      '古诗文默写部分丢分较多，主要原因是字形记忆不够牢固（如将"郎"写成"朗"，将"裁"写成"载"）。建议采用"看拼音写汉字""根据意思填诗句"等多种方式交叉复习，强化记忆效果。',
    ].join('\n\n')
  },
  {
    title: '初中英语鼓励寄语-发音与参与度',
    content_type: 'teacher_comment_english',
    content: [
      "Your progress in English this semester has been truly impressive! Your pronunciation has improved significantly, and you now participate actively in class discussions. The way you tackle vocabulary memorization with flashcards shows great study habits. Keep up this wonderful momentum!",
      "I've noticed a wonderful change in your attitude toward English learning. You used to be hesitant to speak up, but now you volunteer to read aloud and even help classmates with their pronunciation. This confidence will take you far! Remember: every expert was once a beginner.",
      "Your English journal entries are becoming more creative and expressive each week. The effort you put into using new vocabulary words in context is commendable. Don't worry about making mistakes—they are proof that you are trying and growing. I believe in your potential!",
      'The improvement in your listening comprehension is remarkable! You can now follow class instructions and English videos much better than before. Your dedication to practicing with English songs and podcasts is paying off. Stay curious and keep exploring!',
    ].join('\n\n')
  },
  {
    title: '班主任综合评语-德智体美劳全面发展',
    content_type: 'teacher_comment_homeroom',
    content: [
      '本学期该生在德智体美劳各方面均有长足进步。在学习上，态度端正，各科成绩均衡发展，尤其在集体活动中展现出的领导才能令人印象深刻。与同学相处融洽，乐于助人，多次被推选为"文明之星"。希望下学期能在时间管理上进一步优化，平衡好学业与兴趣发展。',
      '回顾这一学期的表现，该生是一位全面发展的好学生。课堂上专注听讲，作业按时高质量完成；课下积极参加班级活动，担任文艺委员期间认真负责，为班集体做出了重要贡献。性格开朗阳光，是同学们信赖的好朋友。期待你在未来的学习道路上继续发光发热！',
      '该生本学期表现优异，给人留下深刻印象的是其强烈的责任心和自律精神。无论是值日工作还是小组合作任务，都能一丝不苟地完成。学习成绩稳中有升，特别是在理科方面的逻辑思维能力突出。建议适当参加体育锻炼，保持身心健康全面发展。',
    ].join('\n\n')
  },
  {
    title: '教育评价原则-五条核心原则',
    content_type: 'evaluation_principle',
    content: [
      '【具体化原则】避免空洞的"学习认真"等套话，必须描述具体行为。例如不说"学习认真"，而说"能在课后主动整理错题本并标注易错点"；不说"团结同学"，而说"在分组实验中主动承担记录工作并协调组员分工"。',
      '【发展性原则】关注进步幅度而非绝对水平。例如："相比上学期，阅读理解题的正确率提升了20%，说明你的精读策略调整很有效果。"让每个学生都能看到自己的成长轨迹。',
      '【个性化原则】发现每个学生的独特闪光点。例如："虽然总分不高，但在几何直觉方面展现出超出同龄人的敏感度——你能一眼看出图形中的辅助线位置，这是非常宝贵的天赋。"',
      '【建设性原则】改进建议必须可操作。例如不说"要努力"，而是"建议每天花5分钟朗读课文，重点练习停顿和语气"。让学生知道具体怎么做。',
      '【平衡性原则】表扬与建议比例控制在7:3到6:4之间。每一条建议都应包裹在肯定之中——先肯定已有的努力和成果，再提出可以更好的方向。',
    ].join('\n\n')
  },
  {
    title: '语言风格模板-开头过渡句结尾鼓励句',
    content_type: 'language_template',
    content: [
      '【开头过渡句范例】"本学期以来，XX同学在各方面都取得了可喜的进步..."/"回顾这一学期的校园生活，最让我印象深刻的是..."/"时光飞逝，转眼间一个学期又过去了。在这段时间里，XX同学用行动证明了..."',
      '【正面描述句范例】"课堂上的你总是坐得笔直，目光紧随老师的讲解"/"每次批改你的作业都是一种享受——字迹工整、步骤清晰、答案准确"/"在运动场上，你挥洒汗水的身影成为了班级一道亮丽的风景线"',
      '【改进措辞句范例】三明治话术：先肯定→再指出问题→最后给期望。如："你的作文立意很好（肯定），如果在第二段能加入一个具体的事例来支撑观点，文章会更有说服力（问题），相信以你的文字功底，这对你来说不难（期望）"',
      '【结尾鼓励句范例】"期待你在新学期里绽放更耀眼的光芒！"/"相信只要你保持这份热情和坚持，一定能实现心中的目标。老师会一直为你加油！"/"愿你像一颗小树苗一样，在知识的阳光下茁壮成长，终有一天成为参天大树！"',
    ].join('\n\n')
  }
];

async function insertDoc(doc) {
  const res = await fetch(SUPABASE_URL, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      title: doc.title,
      content: doc.content,
      content_type: doc.content_type,
      is_published: true
    })
  });
  if (res.ok) {
    const data = await res.json();
    console.log('OK:', doc.title, '-> id:', data[0]?.id);
  } else {
    const text = await res.text();
    console.error('FAIL:', doc.title, '->', res.status, text);
  }
}

async function main() {
  console.log('Inserting', SEED_DATA.length, 'documents...');
  for (let i = 0; i < SEED_DATA.length; i++) {
    await insertDoc(SEED_DATA[i]);
  }
  console.log('Done!');
}

main().catch(e => console.error(e));