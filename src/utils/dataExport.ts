interface ExportStudentRow {
  name: string;
  gender: string;
  examCount: number;
  conversationCount: number;
  homeVisitCount: number;
  behaviorCount: number;
  behaviorPoints: number;
  dataCoverage: number;
}

interface ExportOptions {
  filename?: string;
  includeHeader?: boolean;
}

export function exportClassDataToCSV(
  students: Array<{ id: string; name: string; gender?: string }>,
  exams: Record<string, any[]>,
  conversations: Record<string, any[]>,
  homeVisits: Record<string, any[]>,
  behaviors: Record<string, any[]>,
  options: ExportOptions = {}
): void {
  const rows: string[][] = [];

  if (options.includeHeader !== false) {
    rows.push(['姓名', '性别', '成绩数', '谈话数', '家访数', '行为记录', '积分', '数据覆盖度']);
  }

  students.forEach(s => {
    const eCount = exams[s.id]?.length || 0;
    const cCount = conversations[s.id]?.length || 0;
    const hCount = homeVisits[s.id]?.length || 0;
    const bCount = behaviors[s.id]?.length || 0;
    const points = (behaviors[s.id] || []).reduce((sum: number, b: any) => sum + (b.points || 0), 0);
    let coverage = 0;
    if (eCount > 0) coverage++;
    if (cCount > 0) coverage++;
    if (hCount > 0) coverage++;
    if (bCount > 0) coverage++;

    rows.push([
      s.name,
      s.gender === 'male' ? '男' : s.gender === 'female' ? '女' : '-',
      String(eCount),
      String(cCount),
      String(hCount),
      String(bCount),
      String(points),
      `${coverage}/4`,
    ]);
  });

  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = options.filename || `班级数据看板_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function exportStudentDetailToCSV(
  studentName: string,
  exams: any[],
  conversations: any[],
  homeVisits: any[],
  behaviors: any[],
  options: ExportOptions = {}
): void {
  const rows: string[][] = [];
  rows.push([`=== ${studentName} 的详细数据报告 ===`]);
  rows.push([]);
  rows.push(['【成绩记录】']);

  if (exams.length > 0) {
    rows.push(['考试名称', '科目', '分数', '满分', '排名', '日期']);
    exams.forEach(e => {
      rows.push([
        e.exam_name || '-', e.subject || '-', String(e.score || '-'),
        String(e.full_score || 100), e.class_rank ? `第${e.class_rank}名` : '-',
        e.exam_date || '-',
      ]);
    });
  } else {
    rows.push(['暂无成绩记录']);
  }

  rows.push([]);
  rows.push(['【谈话记录】']);
  if (conversations.length > 0) {
    rows.push(['类型', '内容摘要', '学生反应', '日期']);
    const typeMap: Record<string, string> = { daily: '日常沟通', discipline: '纪律谈话', praise: '表扬鼓励', psychological: '心理疏导', goal: '目标规划' };
    conversations.forEach(c => {
      rows.push([
        typeMap[c.conversation_type] || c.conversation_type || '-',
        (c.content || '').slice(0, 80),
        c.student_reaction || '-', c.conversation_date || '-',
      ]);
    });
  } else {
    rows.push(['暂无谈话记录']);
  }

  rows.push([]);
  rows.push(['【家访记录】']);
  if (homeVisits.length > 0) {
    rows.push(['类型', '目的/议题', '共识', '日期']);
    const visitMap: Record<string, string> = { in_person: '上门家访', phone: '电话家访', video: '视频家访', school_meeting: '到校面谈' };
    homeVisits.forEach(v => {
      rows.push([
        visitMap[v.visit_type] || v.visit_type || '-',
        (v.visit_purpose || v.key_topics || '-').slice(0, 80),
        v.consensus || '-', v.visit_date || '-',
      ]);
    });
  } else {
    rows.push(['暂无家访记录']);
  }

  rows.push([]);
  rows.push(['【行为记录】']);
  if (behaviors.length > 0) {
    rows.push(['类型', '分类', '标签', '说明', '积分', '日期']);
    const typeMap: Record<string, string> = { praise: '表扬', warning: '提醒', punishment: '惩罚' };
    const catMap: Record<string, string> = { classroom: '课堂表现', homework: '作业情况', activity: '活动参与', discipline: '纪律表现', other: '其他' };
    behaviors.forEach(b => {
      rows.push([
        typeMap[b.behavior_type] || b.behavior_type || '-',
        catMap[b.behavior_category] || b.behavior_category || '-',
        b.behavior_tag || '-',
        b.description || '-',
        String(b.points || 0),
        b.record_date || '-',
      ]);
    });

    const totalPoints = behaviors.reduce((s: number, x: any) => s + (x.points || 0), 0);
    rows.push([]);
    rows.push([`行为积分合计：${totalPoints >= 0 ? '+' : ''}${totalPoints}`]);
  } else {
    rows.push(['暂无行为记录']);
  }

  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = options.filename || `${studentName}_详细数据_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
