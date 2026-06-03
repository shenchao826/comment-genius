
export interface TimelineItem {
  id: string;
  type: 'exam' | 'conversation' | 'homevisit' | 'behavior';
  date: string;
  title: string;
  subtitle?: string;
  detail: string;
  meta?: string;
  colorClass: string;
  icon: string;
}

interface DataTimelineProps {
  items: TimelineItem[];
  compact?: boolean;
}

const TYPE_CONFIG: Record<string, { icon: string; colorClass: string; bgColor: string }> = {
  exam: { icon: '📊', colorClass: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  conversation: { icon: '💬', colorClass: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-200' },
  homevisit: { icon: '🏠', colorClass: 'text-indigo-600', bgColor: 'bg-indigo-50 border-indigo-200' },
  behavior: { icon: '⭐', colorClass: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
};

export default function DataTimeline({ items = [], compact = false }: DataTimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div className={`text-center py-8 ${compact ? '' : 'px-4'}`}>
        <p className="text-4xl mb-2">📭</p>
        <p className="text-gray-400 text-sm">暂无记录</p>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  const displayItems = compact ? sorted.slice(0, 8) : sorted;

  const groupedByMonth = displayItems.reduce<Record<string, typeof displayItems>>((acc, item) => {
    const monthKey = item.date ? item.date.substring(0, 7) : '未知';
    if (!acc[monthKey]) acc[monthKey] = [];
    acc[monthKey].push(item);
    return acc;
  }, {});

  const config = (type: string) => TYPE_CONFIG[type] || TYPE_CONFIG.behavior;

  return (
    <div className={compact ? '' : 'space-y-6'}>
      {Object.entries(groupedByMonth).map(([month, monthItems]) => (
        <div key={month}>
          {!compact && (
            <h4 className="text-sm font-semibold text-gray-500 mb-3 sticky top-0 bg-white/90 backdrop-blur-sm py-1">
              📅 {month}
            </h4>
          )}
          <div className="relative">
            {!compact && (
              <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />
            )}
            <div className="space-y-3">
              {monthItems.map((item) => {
                const cfg = config(item.type);
                return (
                  <div
                    key={item.id}
                    className={`relative ${!compact ? 'pl-10' : ''} group`}
                  >
                    {!compact && (
                      <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 ${
                        item.type === 'exam' ? 'border-blue-400 bg-blue-100' :
                        item.type === 'conversation' ? 'border-teal-400 bg-teal-100' :
                        item.type === 'homevisit' ? 'border-indigo-400 bg-indigo-100' :
                        'border-purple-400 bg-purple-100'
                      }`} />
                    )}
                    <div className={`rounded-lg border p-3 transition-shadow hover:shadow-sm ${cfg.bgColor}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${cfg.colorClass}`}>{item.title}</span>
                            {item.meta && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/60 text-gray-500">
                                {item.meta}
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</p>
                          )}
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.detail}</p>
                          <p className="text-[10px] text-gray-400 mt-1">{item.date}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}

      {compact && items.length > 8 && (
        <button
          type="button"
          className="w-full text-center text-xs text-blue-600 hover:text-blue-800 py-2"
          onClick={() => {}}
        >
          查看全部 {items.length} 条记录 →
        </button>
      )}
    </div>
  );
}

export function buildTimelineFromData(exams: any[], conversations: any[], homeVisits: any[], behaviors: any[]): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const e of exams || []) {
    items.push({
      id: `exam-${e.id}`,
      type: 'exam',
      date: e.exam_date || e.created_at || '',
      title: `${e.exam_name || '考试'} · ${e.subject || ''}`,
      subtitle: `${e.score}/${e.full_score || 100}${e.class_rank ? ` 第${e.class_rank}名` : ''}`,
      detail: `分数：${e.score}，满分：${e.full_score || 100}${e.class_avg ? `，班级均分：${e.class_avg}` : ''}`,
      meta: e.subject,
      colorClass: 'text-blue-600',
      icon: '📊',
    });
  }

  for (const c of conversations || []) {
    const typeLabels: Record<string, string> = {
      daily: '日常沟通', discipline: '纪律谈话', praise: '表扬鼓励',
      psychological: '心理疏导', goal: '目标规划',
    };
    items.push({
      id: `conv-${c.id}`,
      type: 'conversation',
      date: c.conversation_date || c.created_at || '',
      title: `${typeLabels[c.conversation_type] || c.conversation_type || '谈话'}`,
      subtitle: c.student_reaction ? `学生反应：${c.student_reaction}` : undefined,
      detail: c.content || '',
      meta: c.category,
      colorClass: 'text-teal-600',
      icon: '💬',
    });
  }

  for (const v of homeVisits || []) {
    const visitLabels: Record<string, string> = {
      in_person: '上门家访', phone: '电话家访', video: '视频家访', school_meeting: '到校面谈',
    };
    items.push({
      id: `visit-${v.id}`,
      type: 'homevisit',
      date: v.visit_date || v.created_at || '',
      title: visitLabels[v.visit_type] || v.visit_type || '家校联系',
      subtitle: v.consensus ? `共识：${v.consensus}` : undefined,
      detail: v.visit_purpose || v.key_topics || '',
      meta: v.family_structure,
      colorClass: 'text-indigo-600',
      icon: '🏠',
    });
  }

  for (const b of behaviors || []) {
    const typeLabels: Record<string, string> = { praise: '表扬', warning: '提醒', punishment: '惩罚' };
    items.push({
      id: `beh-${b.id}`,
      type: 'behavior',
      date: b.record_date || b.created_at || '',
      title: `${typeLabels[b.behavior_type] || b.behavior_type} · ${b.behavior_tag || ''}`,
      subtitle: b.description || undefined,
      detail: b.description || b.behavior_tag || '',
      meta: b.points ? (b.points > 0 ? `+${b.points}` : `${b.points}`) : undefined,
      colorClass: 'text-purple-600',
      icon: b.behavior_type === 'praise' ? '🌟' : b.behavior_type === 'warning' ? '⚡' : '🔴',
    });
  }

  return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
