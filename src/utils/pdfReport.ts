import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExamData {
  examName: string;
  subject: string;
  score: number | null;
  fullScore: number | null;
  classAvg: number | null;
  rank?: number | null;
  examDate?: string;
}

export interface ConversationData {
  id: string;
  type: string;
  content: string;
  date: string;
}

export interface HomeVisitData {
  id: string;
  visitType: string;
  purpose: string;
  consensus: string;
  date: string;
}

export interface BehaviorData {
  id: string;
  behaviorType: string;
  category: string;
  tags: string[];
  points: number;
  date: string;
}

export interface StudentReportData {
  studentName: string;
  className: string;
  gender: string;
  role: string;
  teacherName: string;
  reportDate: string;
  semester: string;
  exams: ExamData[];
  conversations: ConversationData[];
  homeVisits: HomeVisitData[];
  behaviors: BehaviorData[];
  summary?: string;
  recommendations?: string[];
}

export interface ReportConfig {
  title: string;
  subtitle?: string;
  includeCharts: boolean;
  includeDetails: boolean;
  includeRecommendations: boolean;
  pageSize: 'a4' | 'letter';
  orientation: 'portrait' | 'landscape';
}

const DEFAULT_CONFIG: ReportConfig = {
  title: '学生学情分析报告',
  subtitle: '',
  includeCharts: true,
  includeDetails: true,
  includeRecommendations: true,
  pageSize: 'a4',
  orientation: 'portrait',
};

class PDFReportGenerator {
  private doc: jsPDF;
  private config: ReportConfig;
  private currentY: number = 20;
  private pageWidth: number;

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.doc = new jsPDF({
      orientation: this.config.orientation,
      unit: 'mm',
      format: this.config.pageSize,
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
  }

  private checkPageBreak(neededHeight: number): void {
    const pageHeight = this.doc.internal.pageSize.getHeight();
    if (this.currentY + neededHeight > pageHeight - 20) {
      this.doc.addPage();
      this.currentY = 20;
    }
  }

  private addHeader(): void {
    // 标题背景
    this.doc.setFillColor(59, 130, 246);
    this.doc.rect(0, 0, this.pageWidth, 40, 'F');

    // 标题文字
    this.doc.setTextColor(255, 255, 255);
    this.doc.setFontSize(22);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(this.config.title, this.pageWidth / 2, 18, { align: 'center' });

    if (this.config.subtitle) {
      this.doc.setFontSize(12);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(this.config.subtitle, this.pageWidth / 2, 28, { align: 'center' });
    }

    // 装饰线
    this.doc.setDrawColor(96, 165, 250);
    this.doc.setLineWidth(0.5);
    this.doc.line(20, 36, this.pageWidth - 20, 36);

    this.currentY = 50;
  }

  private addStudentInfo(data: StudentReportData): void {
    this.checkPageBreak(35);

    // 学生信息卡片
    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(15, this.currentY, this.pageWidth - 30, 30, 3, 3, 'F');

    this.doc.setTextColor(30, 41, 59);
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(`学生：${data.studentName}`, 22, this.currentY + 10);

    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(71, 85, 105);

    const infoLeft = 22;
    const infoRight = this.pageWidth / 2 + 10;

    this.doc.text(`班级：${data.className}`, infoLeft, this.currentY + 18);
    this.doc.text(`性别：${data.gender}`, infoRight, this.currentY + 18);
    this.doc.text(`职务：${data.role || '-'}`, infoLeft, this.currentY + 25);
    this.doc.text(`报告日期：${data.reportDate}`, infoRight, this.currentY + 25);

    this.currentY += 40;
  }

  private addSectionTitle(title: string, icon: string = ''): void {
    this.checkPageBreak(15);

    // 分隔线
    if (this.currentY > 55) {
      this.doc.setDrawColor(226, 232, 240);
      this.doc.setLineWidth(0.3);
      this.doc.line(15, this.currentY - 5, this.pageWidth - 15, this.currentY - 5);
    }

    // 标题背景条
    this.doc.setFillColor(239, 246, 255);
    this.doc.roundedRect(15, this.currentY, this.pageWidth - 30, 9, 2, 2, 'F');

    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(29, 78, 216);

    const displayTitle = icon ? `${icon} ${title}` : title;
    this.doc.text(displayTitle, 18, this.currentY + 6.5);

    this.currentY += 14;
  }

  private addExamSummary(data: StudentReportData): void {
    if (!data.exams || data.exams.length === 0) return;

    this.addSectionTitle('📊 成绩概况');

    // 计算统计数据
    const validExams = data.exams.filter(e => e.score != null && e.fullScore != null);
    const avgScore = validExams.length > 0
      ? Math.round(validExams.reduce((sum, e) => sum + (e.score! / e.fullScore!) * 100, 0) / validExams.length)
      : 0;
    const highestScore = validExams.length > 0
      ? Math.max(...validExams.map(e => (e.score! / e.fullScore!) * 100))
      : 0;
    const lowestScore = validExams.length > 0
      ? Math.min(...validExams.map(e => (e.score! / e.fullScore!) * 100))
      : 0;

    // 统计卡片
    this.checkPageBreak(25);
    const cardWidth = (this.pageWidth - 38) / 3;
    const stats = [
      { label: '平均分', value: `${avgScore}`, color: [59, 130, 246] },
      { label: '最高分', value: `${Math.round(highestScore)}`, color: [16, 185, 129] },
      { label: '最低分', value: `${Math.round(lowestScore)}`, color: [245, 158, 11] },
    ];

    stats.forEach((stat, i) => {
      const x = 17 + i * (cardWidth + 4);
      this.doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
      this.doc.roundedRect(x, this.currentY, cardWidth, 18, 2, 2, 'F');

      this.doc.setTextColor(255, 255, 255);
      this.doc.setFontSize(16);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(stat.value, x + cardWidth / 2, this.currentY + 9, { align: 'center' });

      this.doc.setFontSize(9);
      this.doc.setFont('helvetica', 'normal');
      this.doc.text(stat.label, x + cardWidth / 2, this.currentY + 15, { align: 'center' });
    });

    this.currentY += 26;

    // 成绩明细表
    if (this.config.includeDetails && data.exams.length > 0) {
      this.checkPageBreak(30);

      const tableData = data.exams.map(exam => [
        exam.examName || '-',
        exam.subject || '-',
        exam.score != null ? String(exam.score) : '-',
        exam.fullScore != null ? String(exam.fullScore) : '-',
        exam.classAvg != null ? String(exam.classAvg) : '-',
        exam.rank != null ? String(exam.rank) : '-',
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['考试名称', '科目', '得分', '满分', '班级均分', '排名']],
        body: tableData,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          halign: 'center',
        },
        headStyles: {
          fillColor: [59, 130, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 18 },
          2: { cellWidth: 18 },
          3: { cellWidth: 18 },
          4: { cellWidth: 22 },
          5: { cellWidth: 18 },
        },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
    }
  }

  private addBehaviorAnalysis(data: StudentReportData): void {
    if (!data.behaviors || data.behaviors.length === 0) return;

    this.addSectionTitle('⭐ 行为表现');

    // 行为统计
    const positiveTypes = ['积极发言', '帮助同学', '认真听讲', '完成作业', '进步'];
    const negativeTypes = ['违纪', '迟到', '缺交作业', '课堂干扰'];

    const positiveCount = data.behaviors.filter(b =>
      positiveTypes.some(t => b.behaviorType?.includes(t))
    ).length;
    const negativeCount = data.behaviors.filter(b =>
      negativeTypes.some(t => b.behaviorType?.includes(t))
    ).length;
    const totalPoints = data.behaviors.reduce((sum, b) => sum + (b.points || 0), 0);

    this.checkPageBreak(20);

    // 统计行
    this.doc.setFontSize(10);
    this.doc.setTextColor(51, 65, 85);
    this.doc.text(`正面行为：${positiveCount} 次`, 20, this.currentY + 5);
    this.doc.text(`待改进：${negativeCount} 次`, 70, this.currentY + 5);
    this.doc.text(`积分总计：${totalPoints >= 0 ? '+' : ''}${totalPoints}`, 120, this.currentY + 5);

    this.currentY += 12;

    // 行为记录表格
    if (this.config.includeDetails) {
      const tableData = data.behaviors.slice(0, 15).map(b => [
        b.date ? b.date.split('T')[0] : '-',
        b.behaviorType || '-',
        b.category || '-',
        (b.tags || []).join(', ') || '-',
        b.points != null ? (b.points > 0 ? `+${b.points}` : String(b.points)) : '-',
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['日期', '行为类型', '分类', '标签', '积分']],
        body: tableData,
        margin: { left: 15, right: 15 },
        styles: {
          fontSize: 8,
          cellPadding: 2,
          halign: 'center',
        },
        headStyles: {
          fillColor: [139, 92, 246],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [250, 245, 255],
        },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 8;
    }
  }

  private addInteractionRecords(data: StudentReportData): void {
    const hasConversations = data.conversations && data.conversations.length > 0;
    const hasHomeVisits = data.homeVisits && data.homeVisits.length > 0;

    if (!hasConversations && !hasHomeVisits) return;

    this.addSectionTitle('💬 家校沟通记录');

    if (hasConversations && this.config.includeDetails) {
      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(29, 78, 216);
      this.doc.text(`谈话记录（${data.conversations!.length}次）`, 18, this.currentY);
      this.currentY += 7;

      const convData = data.conversations!.slice(0, 5).map(c => [
        c.date ? c.date.split('T')[0] : '-',
        c.type || '-',
        (c.content || '').substring(0, 50) + (c.content && c.content.length > 50 ? '...' : ''),
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['日期', '类型', '内容摘要']],
        body: convData,
        margin: { left: 15, right: 15 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [14, 165, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [240, 249, 255] },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 6;
    }

    if (hasHomeVisits && this.config.includeDetails) {
      this.checkPageBreak(20);

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(99, 102, 241);
      this.doc.text(`家访记录（${data.homeVisits!.length}次）`, 18, this.currentY);
      this.currentY += 7;

      const visitData = data.homeVisits!.slice(0, 5).map(v => [
        v.date ? v.date.split('T')[0] : '-',
        v.visitType || '-',
        (v.purpose || '').substring(0, 40),
        (v.consensus || '').substring(0, 40),
      ]);

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['日期', '类型', '目的', '共识']],
        body: visitData,
        margin: { left: 15, right: 15 },
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [168, 85, 247], textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [250, 245, 255] },
      });

      this.currentY = (this.doc as any).lastAutoTable.finalY + 6;
    }
  }

  private addSummaryAndRecommendations(data: StudentReportData): void {
    if (!this.config.includeRecommendations) return;

    this.addSectionTitle('📋 综合评价与建议');

    this.checkPageBreak(60);

    // AI 生成的总结
    if (data.summary) {
      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(30, 41, 59);
      this.doc.text('学情总结', 18, this.currentY);
      this.currentY += 7;

      this.doc.setFontSize(10);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(71, 85, 105);

      const summaryLines = this.doc.splitTextToSize(data.summary, this.pageWidth - 40);
      this.doc.text(summaryLines, 18, this.currentY);
      this.currentY += summaryLines.length * 5 + 8;
    }

    // 建议
    if (data.recommendations && data.recommendations.length > 0) {
      this.checkPageBreak(30);

      this.doc.setFontSize(11);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(30, 41, 59);
      this.doc.text('改进建议', 18, this.currentY);
      this.currentY += 7;

      data.recommendations.forEach((rec, i) => {
        this.checkPageBreak(12);

        this.doc.setFillColor(236, 253, 245);
        this.doc.roundedRect(18, this.currentY, this.pageWidth - 36, 10, 2, 2, 'F');

        this.doc.setFontSize(9);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setTextColor(21, 128, 61);

        const numCircle = { type: 'circle', r: 4 } as const;
        this.doc.text(`${i + 1}. ${rec}`, 24, this.currentY + 6);

        this.currentY += 13;
      });
    }
  }

  private addFooter(data: StudentReportData): void {
    const pageHeight = this.doc.internal.pageSize.getHeight();

    // 页脚线
    this.doc.setDrawColor(226, 232, 240);
    this.doc.setLineWidth(0.3);
    this.doc.line(15, pageHeight - 15, this.pageWidth - 15, pageHeight - 15);

    // 页脚信息
    this.doc.setFontSize(8);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(148, 163, 184);

    this.doc.text(
      `由 ${data.teacherName || '评语助手'} 生成 · ${new Date().toLocaleDateString('zh-CN')}`,
      this.pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    this.doc.text(
      `© 2026 CommentGenius 评语助手`,
      this.pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );
  }

  generate(data: StudentReportData): jsPDF {
    this.addHeader();
    this.addStudentInfo(data);
    this.addExamSummary(data);
    this.addBehaviorAnalysis(data);
    this.addInteractionRecords(data);
    this.addSummaryAndRecommendations(data);
    this.addFooter(data);

    return this.doc;
  }

  download(data: StudentReportData, filename?: string): void {
    const pdf = this.generate(data);
    const defaultFilename = `${data.studentName}_学情报告_${data.reportDate.replace(/-/g, '')}.pdf`;
    pdf.save(filename || defaultFilename);
  }

  getBlob(data: StudentReportData): Blob {
    const pdf = this.generate(data);
    return pdf.output('blob');
  }

  getDataURL(data: StudentReportData): string {
    const pdf = this.generate(data);
    return pdf.output('datauristring');
  }
}

export function generateStudentReport(
  data: StudentReportData,
  config?: Partial<ReportConfig>
): PDFReportGenerator {
  return new PDFReportGenerator(config);
}

export function downloadStudentReport(
  data: StudentReportData,
  filename?: string
): void {
  const generator = new PDFReportGenerator();
  generator.download(data, filename);
}

export function getReportBlob(
  data: StudentReportData,
  config?: Partial<ReportConfig>
): Blob {
  const generator = new PDFReportGenerator(config);
  return generator.getBlob(data);
}
