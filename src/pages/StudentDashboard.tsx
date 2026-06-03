import { useState, useEffect, useMemo, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import SEO from '../components/SEO';
import DataTimeline, { buildTimelineFromData } from '../components/DataTimeline';
import { DataBarChart, BehaviorPieChart, TrendLineChart, CoverageMatrix } from '../components/Charts';
import { api } from '../utils/apiClient';

interface Student {
  id: string;
  name: string;
  gender?: string;
  class_role?: string;
}

interface DashboardStats {
  totalStudents: number;
  totalExams: number;
  totalConversations: number;
  totalHomeVisits: number;
  totalBehaviors: number;
  behaviorPoints: number;
  studentsWithData: number;
}

const StudentDashboard: FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classes, setClasses] = useState<{ id: string; name: string; student_count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [allExams, setAllExams] = useState<Record<string, any[]>>({});
  const [allConversations, setAllConversations] = useState<Record<string, any[]>>({});
  const [allHomeVisits, setAllHomeVisits] = useState<Record<string, any[]>>({});
  const [allBehaviors, setAllBehaviors] = useState<Record<string, any[]>>({});

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalExams: 0,
    totalConversations: 0,
    totalHomeVisits: 0,
    totalBehaviors: 0,
    behaviorPoints: 0,
    studentsWithData: 0,
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (students.length > 0) {
      students.forEach(s => {
        fetchStudentData(s.id);
      });
    }
  }, [students.length]);

  useEffect(() => {
    let totalE = 0, totalC = 0, totalH = 0, totalB = 0, totalP = 0, withData = 0;
    for (const sid of Object.keys(allExams)) {
      totalE += allExams[sid]?.length || 0;
      totalC += allConversations[sid]?.length || 0;
      totalH += allHomeVisits[sid]?.length || 0;
      totalB += allBehaviors[sid]?.length || 0;
      if (allBehaviors[sid]) {
        totalP += allBehaviors[sid].reduce((sum: number, b: any) => sum + (b.points || 0), 0);
      }
      if ((allExams[sid]?.length || 0) + (allConversations[sid]?.length || 0) +
          (allHomeVisits[sid]?.length || 0) + (allBehaviors[sid]?.length || 0) > 0) {
        withData++;
      }
    }
    setStats({
      totalStudents: students.length,
      totalExams: totalE,
      totalConversations: totalC,
      totalHomeVisits: totalH,
      totalBehaviors: totalB,
      behaviorPoints: totalP,
      studentsWithData: withData,
    });
  }, [allExams, allConversations, allHomeVisits, allBehaviors, students.length]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/api/classes');
      setClasses((res.data as any).classes || []);
      if ((res.data as any).classes?.length > 0 && !selectedClassId) {
        setSelectedClassId((res.data as any).classes[0].id);
      }
    } catch { /* ignore */ }
  };

  const fetchStudents = async (classId: string) => {
    setIsLoading(true);
    try {
      const res = await api.get(`/api/students?class_id=${classId}`);
      setStudents((res.data as any).students || []);
    } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  const fetchStudentData = async (studentId: string) => {
    try {
      const [eRes, cRes, hRes, bRes] = await Promise.all([
        api.get(`/api/exams?student_id=${studentId}`),
        api.get(`/api/conversations?student_id=${studentId}`),
        api.get(`/api/home-visits?student_id=${studentId}`),
        api.get(`/api/behaviors?student_id=${studentId}`),
      ]);

      setAllExams(prev => ({ ...prev, [studentId]: (eRes.data as any).data || [] }));
      setAllConversations(prev => ({ ...prev, [studentId]: (cRes.data as any).data || [] }));
      setAllHomeVisits(prev => ({ ...prev, [studentId]: (hRes.data as any).data || [] }));
      setAllBehaviors(prev => ({ ...prev, [studentId]: (bRes.data as any).data || [] }));
    } catch { /* ignore */ }
  };

  const selectedStudent = students.find(s => s.id === selectedStudentId);
  const timelineItems = selectedStudentId
    ? buildTimelineFromData(
        allExams[selectedStudentId] || [],
        allConversations[selectedStudentId] || [],
        allHomeVisits[selectedStudentId] || [],
        allBehaviors[selectedStudentId] || []
      )
    : [];

  const getStudentDataCoverage = (sid: string): number => {
    let count = 0;
    if ((allExams[sid]?.length || 0) > 0) count++;
    if ((allConversations[sid]?.length || 0) > 0) count++;
    if ((allHomeVisits[sid]?.length || 0) > 0) count++;
    if ((allBehaviors[sid]?.length || 0) > 0) count++;
    return count;
  };

  const getStudentPoints = (sid: string): number => {
    return (allBehaviors[sid] || []).reduce((s: number, b: any) => s + (b.points || 0), 0);
  };

  const exportClassData = () => {
    const rows: string[][] = [['姓名', '性别', '成绩数', '谈话数', '家访数', '行为记录', '积分']];
    students.forEach(s => {
      rows.push([
        s.name,
        s.gender === 'male' ? '男' : s.gender === 'female' ? '女' : '-',
        String(allExams[s.id]?.length || 0),
        String(allConversations[s.id]?.length || 0),
        String(allHomeVisits[s.id]?.length || 0),
        String(allBehaviors[s.id]?.length || 0),
        String(getStudentPoints(s.id)),
      ]);
    });
    const csvContent = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${classes.find(c => c.id === selectedClassId)?.name || '班级'}_数据看板.csv`;
    link.click();
  };

  const currentClass = classes.find(c => c.id === selectedClassId);

  const behaviorTypeData = useMemo(() => {
    const typeMap: Record<string, number> = {};
    for (const sid of Object.keys(allBehaviors)) {
      for (const b of allBehaviors[sid] || []) {
        typeMap[b.behavior_type] = (typeMap[b.behavior_type] || 0) + 1;
      }
    }
    return [
      { name: '表扬', value: typeMap.praise || 0 },
      { name: '提醒', value: typeMap.warning || 0 },
      { name: '惩罚', value: typeMap.punishment || 0 },
    ];
  }, [allBehaviors]);

  const pointsTrendData = useMemo(() => {
    const studentPoints: Array<{ name: string; points: number }> = [];
    students.forEach(s => {
      const pts = getStudentPoints(s.id);
      if (allBehaviors[s.id]?.length > 0) {
        studentPoints.push({ name: s.name, points: pts });
      }
    });
    return studentPoints
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
      .map((s) => ({ name: s.name.length > 4 ? s.name.slice(0, 4) : s.name, value: s.points }));
  }, [students, allBehaviors]);

  const coverageMatrixData = useMemo(() => {
    return students.map(s => ({
      name: s.name,
      coverage: {
        exam: (allExams[s.id]?.length || 0) > 0,
        conversation: (allConversations[s.id]?.length || 0) > 0,
        homeVisit: (allHomeVisits[s.id]?.length || 0) > 0,
        behavior: (allBehaviors[s.id]?.length || 0) > 0,
      },
    }));
  }, [students, allExams, allConversations, allHomeVisits, allBehaviors]);

  const chartData = useMemo(() => {
    const coverageData = students.map(s => ({
      name: s.name,
      value: getStudentDataCoverage(s.id),
    }));

    const dimensionDistData = [
      { name: '📊 成绩', value: stats.totalExams },
      { name: '💬 谈话', value: stats.totalConversations },
      { name: '🏠 家访', value: stats.totalHomeVisits },
      { name: '⭐ 行为', value: stats.totalBehaviors },
    ];

    return { coverageData, behaviorTypeData, dimensionDistData, pointsTrendData, coverageMatrixData };
  }, [students, allExams, allConversations, allHomeVisits, allBehaviors, stats, behaviorTypeData, pointsTrendData, coverageMatrixData]);

  const statCards = [
    { icon: '👨‍🎓', label: '学生总数', value: stats.totalStudents, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { icon: '📊', label: '成绩记录', value: stats.totalExams, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { icon: '💬', label: '谈话记录', value: stats.totalConversations, color: 'bg-teal-50 border-teal-200 text-teal-700' },
    { icon: '🏠', label: '家访记录', value: stats.totalHomeVisits, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { icon: '⭐', label: '行为记录', value: stats.totalBehaviors, color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { icon: '📈', label: '行为积分', value: stats.behaviorPoints >= 0 ? `+${stats.behaviorPoints}` : stats.behaviorPoints, color: stats.behaviorPoints >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700' },
    { icon: '✅', label: '有数据学生', value: `${stats.studentsWithData}/${stats.totalStudents}`, color: 'bg-green-50 border-green-200 text-green-700' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6">
      <SEO title="数据看板" description="班级数据总览，多维度学生数据分析" />

      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">📊 数据看板</h1>
            <p className="text-sm text-slate-500 mt-1">多维度学生数据总览与分析</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/')} size="sm">← 返回首页</Button>
            <Button variant="secondary" onClick={() => navigate('/students')} size="sm">👨‍🎓 学生管理</Button>
            <Button onClick={exportClassData} size="sm" disabled={students.length === 0}>📤 导出数据</Button>
          </div>
        </div>

        {/* Class Selector */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <span className="text-sm font-medium text-slate-600 whitespace-nowrap">选择班级：</span>
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all text-sm font-medium ${
                  selectedClassId === cls.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cls.name} ({cls.student_count}人)
              </button>
            ))}
            {classes.length === 0 && <span className="text-slate-400 text-sm">暂无班级</span>}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">{[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse" />)}</div>
        ) : !selectedClassId ? (
          <div className="text-center py-16"><p className="text-slate-400">请选择一个班级</p></div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl">📊</div>
            <p className="text-slate-500">暂无学生数据</p>
            <Button onClick={() => navigate('/students')}>去添加学生</Button>
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              {statCards.map(card => (
                <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
                  <div className="text-2xl mb-1">{card.icon}</div>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <div className="text-xs opacity-80 mt-1">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Charts Row 1: Dimension Distribution + Behavior Type */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">� 数据维度分布</h3>
                <DataBarChart data={chartData.dimensionDistData} height={180} barColor="#3B82F6" />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">⭐ 行为类型分布</h3>
                {chartData.behaviorTypeData.some(d => d.value > 0) ? (
                  <BehaviorPieChart data={chartData.behaviorTypeData} height={180} />
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-slate-400 text-sm">
                    暂无行为记录
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row 2: Student Coverage Bar + Points Ranking */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">📈 学生数据覆盖度（Top 10）</h3>
                <DataBarChart
                  data={chartData.coverageData
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10)
                    .map(s => ({ ...s, name: s.name.length > 4 ? s.name.slice(0, 4) + '..' : s.name }))}
                  height={220}
                  barColor="#8B5CF6"
                />
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800 mb-2">🏆 行为积分排名（Top 10）</h3>
                {chartData.pointsTrendData.length > 0 ? (
                  <DataBarChart data={chartData.pointsTrendData} height={220} barColor="#F59E0B" />
                ) : (
                  <div className="flex items-center justify-center h-[220px] text-slate-400 text-sm">
                    暂无行为积分数据
                  </div>
                )}
              </div>
            </div>

            {/* Coverage Matrix */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">🎯 数据覆盖矩阵</h3>
              <CoverageMatrix students={chartData.coverageMatrixData} />
            </div>

            {/* Two-column layout: Student list + Timeline */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Student Detail Cards */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">👥 学生明细</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
                  {students.map(s => {
                    const coverage = getStudentDataCoverage(s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/student/${s.id}`)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors ${
                          selectedStudentId === s.id ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm font-bold text-blue-700 shrink-0">
                          {s.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800 truncate">{s.name}</span>
                            {coverage > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                                {coverage}维
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {(allExams[s.id]?.length || 0) > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">📊{allExams[s.id].length}</span>
                            )}
                            {(allConversations[s.id]?.length || 0) > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-teal-100 text-teal-600">💬{allConversations[s.id].length}</span>
                            )}
                            {(allHomeVisits[s.id]?.length || 0) > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600">🏠{allHomeVisits[s.id].length}</span>
                            )}
                            {(allBehaviors[s.id]?.length || 0) > 0 && (
                              <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-600">⭐{allBehaviors[s.id].length}</span>
                            )}
                            {coverage === 0 && <span className="text-xs text-slate-400">暂无数据</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Timeline Panel */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    🕐 {selectedStudent ? `${selectedStudent.name} 的数据时间线` : '数据时间线'}
                  </h3>
                  {selectedStudent && (
                    <button
                      onClick={() => navigate(`/`)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      为TA生成评语 →
                    </button>
                  )}
                </div>
                <div className="max-h-[480px] overflow-y-auto p-4">
                  {selectedStudentId ? (
                    timelineItems.length > 0 ? (
                      <DataTimeline items={timelineItems} compact={false} />
                    ) : (
                      <div className="text-center py-12 text-gray-400">
                        <p className="text-4xl mb-2">📭</p>
                        <p>该学生暂无数据记录</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <p className="text-4xl mb-2">👆</p>
                      <p className="text-sm">点击左侧学生查看时间线</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
