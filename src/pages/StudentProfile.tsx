import { useState, useEffect, useMemo, type FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import SEO from '../components/SEO';
import DataTimeline, { buildTimelineFromData } from '../components/DataTimeline';
import { DataBarChart, BehaviorPieChart, CoverageMatrix } from '../components/Charts';
import { exportStudentDetailToCSV } from '../utils/dataExport';
import ReportGenerator from '../components/ReportGenerator';
import { api } from '../utils/apiClient';
import { SkeletonCard } from '../components/Skeleton';
import EmptyState from '../components/EmptyState';

const API_BASE = import.meta.env.VITE_RAG_API_URL || '';

const TABS = [
  { key: 'overview' as const, label: '📊 概览' },
  { key: 'timeline' as const, label: '🕐 时间线' },
  { key: 'data' as const, label: '📋 数据明细' },
];

const StudentProfile: FC = () => {
  const { id: studentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [homeVisits, setHomeVisits] = useState<any[]>([]);
  const [behaviors, setBehaviors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'data'>('overview');

  useEffect(() => {
    if (studentId) {
      fetchStudentData();
    }
  }, [studentId]);

  const fetchStudentData = async () => {
    if (!studentId) return;
    setIsLoading(true);
    try {
      const [sRes, eRes, cRes, hRes, bRes] = await Promise.all([
        api.get(`/api/students/${studentId}`),
        api.get(`/api/exams?student_id=${studentId}`),
        api.get(`/api/conversations?student_id=${studentId}`),
        api.get(`/api/home-visits?student_id=${studentId}`),
        api.get(`/api/behaviors?student_id=${studentId}`),
      ]);

      if (sRes.ok) {
        setStudent((sRes.data as any).student || sRes.data);
      }
      if (eRes.ok) { setExams((eRes.data as any).data || []); }
      if (cRes.ok) { setConversations((cRes.data as any).data || []); }
      if (hRes.ok) { setHomeVisits((hRes.data as any).data || []); }
      if (bRes.ok) { setBehaviors((bRes.data as any).data || []); }
    } catch {
      // 静默失败，页面显示空状态
    } finally {
      setIsLoading(false);
    }
  };

  const totalPoints = useMemo(() => behaviors.reduce((sum, b) => sum + (b.points || 0), 0), [behaviors]);
  const timelineItems = useMemo(() => buildTimelineFromData(exams, conversations, homeVisits, behaviors), [exams, conversations, homeVisits, behaviors]);

  const behaviorPieData = useMemo(() => {
    const behaviorTypeMap: Record<string, number> = {};
    behaviors.forEach(b => { behaviorTypeMap[b.behavior_type] = (behaviorTypeMap[b.behavior_type] || 0) + 1; });
    return [
      { name: '表扬', value: behaviorTypeMap.praise || 0 },
      { name: '提醒', value: behaviorTypeMap.warning || 0 },
      { name: '惩罚', value: behaviorTypeMap.punishment || 0 },
    ];
  }, [behaviors]);

  const subjectScores = useMemo(() => exams.map(e => ({
    name: e.subject?.slice(0, 4) || e.exam_name?.slice(0, 4) || '考试',
    value: Math.round((e.score / (e.full_score || 100)) * 100),
  })), [exams]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <SkeletonCard showAvatar lines={4} />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-3 bg-white">
                <div className="h-5 w-5 bg-slate-100 animate-pulse rounded mb-2" />
                <div className="h-6 w-12 bg-slate-100 animate-pulse rounded mb-1" />
                <div className="h-3 w-8 bg-slate-100 animate-pulse rounded" />
              </div>
            ))}
          </div>
          <SkeletonCard showAvatar lines={5} />
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] px-4 py-6 flex items-center justify-center">
        <EmptyState
          icon="🔍"
          title="未找到该学生"
          description="请检查学生信息是否正确，或返回学生列表重新选择"
          action={{
            label: '返回学生列表',
            onClick: () => navigate('/students'),
            variant: 'secondary',
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-6">
      <SEO title={`${student.name} 的详情`} description={`查看${student.name}的多维度数据`} />

      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600 text-sm">← 返回</button>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
              {student.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{student.name}</h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                <span>{student.gender === 'male' ? '男' : student.gender === 'female' ? '女' : '-'}</span>
                {student.class_role && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">{student.class_role}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => navigate(`/`)}>✨ 为TA生成评语</Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportStudentDetailToCSV(student.name, exams, conversations, homeVisits, behaviors)}
            >
              📤 导出数据
            </Button>
          </div>

          {/* PDF 报告生成 */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">📄 学情报告</h4>
            <ReportGenerator
              studentName={student.name}
              className=""
              gender={student.gender === 'male' ? '男' : student.gender === 'female' ? '女' : '-'}
              role={student.class_role || ''}
              exams={exams}
              conversations={conversations}
              homeVisits={homeVisits}
              behaviors={behaviors}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: '📊', label: '成绩', value: exams.length, color: 'bg-blue-50 text-blue-700 border-blue-200' },
            { icon: '💬', label: '谈话', value: conversations.length, color: 'bg-teal-50 text-teal-700 border-teal-200' },
            { icon: '🏠', label: '家访', value: homeVisits.length, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
            { icon: '⭐', label: '行为', value: behaviors.length, color: 'bg-purple-50 text-purple-700 border-purple-200' },
            { icon: '📈', label: '积分', value: totalPoints >= 0 ? `+${totalPoints}` : totalPoints, color: totalPoints >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200' },
            { icon: '✅', label: '覆盖', value: `${[!!exams.length, !!conversations.length, !!homeVisits.length, !!behaviors.length].filter(Boolean).length}/4`, color: 'bg-green-50 text-green-700 border-green-200' },
          ].map(card => (
            <div key={card.label} className={`rounded-xl border p-3 ${card.color}`}>
              <div className="text-lg">{card.icon}</div>
              <div className="text-xl font-bold">{card.value}</div>
              <div className="text-xs opacity-80">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.key ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-5 shadow-sm min-h-[300px]">
          {activeTab === 'overview' && (
            <div className="grid lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">📊 成绩趋势</h3>
                {subjectScores.length > 0 ? (
                  <DataBarChart data={subjectScores} height={180} barColor="#3B82F6" />
                ) : (
                  <EmptyState
                    icon="📊"
                    title="暂无成绩记录"
                    description="添加考试成绩后可查看趋势分析"
                    className="h-[180px] py-8"
                  />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">⭐ 行为分布</h3>
                {behaviorPieData.some(d => d.value > 0) ? (
                  <BehaviorPieChart data={behaviorPieData} height={180} />
                ) : (
                  <EmptyState
                    icon="⭐"
                    title="暂无行为记录"
                    description="记录学生行为后可查看分布统计"
                    className="h-[180px] py-8"
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            timelineItems.length > 0
              ? <DataTimeline items={timelineItems} compact={false} />
              : <EmptyState icon="🕐" title="暂无时间线数据" description="添加成绩、谈话、家访或行为记录后，时间线将在此展示" />
          )}

          {activeTab === 'data' && (
            <div className="space-y-4">
              {exams.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">📊 成绩记录 ({exams.length})</h4>
                  <div className="space-y-2">
                    {exams.map((e, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg text-sm">
                        <span>{e.exam_name} · {e.subject}</span>
                        <span className="font-bold text-blue-700">{e.score}/{e.full_score || 100}{e.class_rank ? ` 第${e.class_rank}名` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {conversations.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">💬 谈话记录 ({conversations.length})</h4>
                  <div className="space-y-2">
                    {conversations.map((c, i) => (
                      <div key={i} className="p-2 bg-teal-50/50 rounded-lg text-sm">
                        <span className="font-medium">{c.conversation_type}</span> · {(c.content || '').slice(0, 60)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {homeVisits.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">🏠 家访记录 ({homeVisits.length})</h4>
                  <div className="space-y-2">
                    {homeVisits.map((v, i) => (
                      <div key={i} className="p-2 bg-indigo-50/50 rounded-lg text-sm">
                        <span className="font-medium">{v.visit_type}</span> · {(v.visit_purpose || '').slice(0, 60)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {behaviors.length > 0 && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-2">⭐ 行为记录 ({behaviors.length})</h4>
                  <div className="space-y-2">
                    {behaviors.map((b, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-purple-50/50 rounded-lg text-sm">
                        <span><strong>{b.behavior_type}</strong> {b.behavior_tag || ''}</span>
                        <span className={`font-bold ${b.points > 0 ? 'text-emerald-600' : b.points < 0 ? 'text-red-600' : ''}`}>
                          {b.points > 0 ? '+' : ''}{b.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {exams.length === 0 && conversations.length === 0 && homeVisits.length === 0 && behaviors.length === 0 && (
                <EmptyState icon="📋" title="暂无任何数据记录" description="添加成绩、谈话、家访或行为记录后，数据将在此展示" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;
