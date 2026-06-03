import { useMemo, type FC } from 'react';
import { clsx } from 'clsx';

interface ExamRecord {
  id: string;
  student_id: string;
  exam_name: string;
  subject: string;
  score: number;
  full_score?: number;
  class_avg?: number;
  class_rank?: number;
  total_count?: number;
  exam_date?: string;
  semester?: string;
}

interface ExamAnalyzerProps {
  exams: ExamRecord[];
  compact?: boolean;
}

function getScoreColor(score: number): { bg: string; text: string } {
  if (score >= 90) return { bg: 'bg-emerald-500', text: 'text-emerald-600' };
  if (score >= 70) return { bg: 'bg-yellow-500', text: 'text-yellow-600' };
  if (score >= 60) return { bg: 'bg-orange-500', text: 'text-orange-600' };
  return { bg: 'bg-red-500', text: 'text-red-600' };
}

function getTrendArrow(prev: number, curr: number): { symbol: string; color: string; diff: number } {
  const diff = curr - prev;
  if (diff > 0) return { symbol: '↑', color: 'text-emerald-500', diff };
  if (diff < 0) return { symbol: '↓', color: 'text-red-500', diff };
  return { symbol: '→', color: 'text-slate-400', diff: 0 };
}

const ExamAnalyzer: FC<ExamAnalyzerProps> = ({ exams = [], compact = false }) => {
  const stats = useMemo(() => {
    if (!exams || exams.length === 0) return null;

    const scores = exams.map(e => e.score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const sortedByScore = [...exams].sort((a, b) => b.score - a.score);
    const highest = sortedByScore[0];
    const lowest = sortedByScore[sortedByScore.length - 1];

    const rankedExams = exams.filter(e => e.class_rank != null && e.class_rank > 0);
    const bestRank = rankedExams.length > 0
      ? rankedExams.reduce((best, e) =>
          (e.class_rank ?? Infinity) < (best.class_rank ?? Infinity) ? e : best,
        )
      : null;

    const subjectGroups = new Map<string, ExamRecord[]>();
    exams.forEach(e => {
      const list = subjectGroups.get(e.subject) || [];
      list.push(e);
      subjectGroups.set(e.subject, list);
    });

    subjectGroups.forEach(list => {
      list.sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''));
    });

    return { avgScore, highest, lowest, bestRank, subjectGroups, totalExams: exams.length };
  }, [exams]);

  if (!stats || exams.length === 0) {
    return (
      <div className={clsx(
        'rounded-xl border border-slate-200 bg-white',
        compact ? 'p-4' : 'p-8',
      )}>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="mb-3 text-4xl opacity-40">📋</div>
          <p className="text-sm font-medium text-slate-500">暂无考试成绩</p>
          <p className="mt-1 text-xs text-slate-400">上传成绩单后可查看智能分析</p>
        </div>
      </div>
    );
  }

  const { avgScore, highest, lowest, bestRank, subjectGroups } = stats;

  return (
    <div className={clsx(
      'rounded-xl border border-slate-200 bg-white shadow-sm',
      compact ? 'p-4' : 'p-6',
    )}>
      {!compact && (
        <div className="mb-5 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-base font-semibold text-[#1E293B]">成绩分析</h3>
          <span className="ml-auto text-xs text-slate-400">共 {stats.totalExams} 条记录</span>
        </div>
      )}

      <div className={clsx('grid grid-cols-3 gap-3', compact ? 'mb-4' : 'mb-6')}>
        <div className="rounded-lg bg-blue-50/80 px-3 py-3">
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium mb-1">
            <span>📈</span> 最近平均分
          </div>
          <div className="text-lg font-bold text-blue-700">{avgScore.toFixed(1)}<span className="ml-0.5 text-xs font-normal text-blue-500">分</span></div>
        </div>

        <div className="rounded-lg bg-purple-50/80 px-3 py-3">
          <div className="flex items-center gap-1.5 text-xs text-purple-600 font-medium mb-1">
            <span>📉</span> 最高 / 最低
          </div>
          <div className="text-sm font-bold text-purple-700">
            {highest.score}<span className="text-[10px] font-normal text-purple-400">({highest.subject})</span>
            <span className="mx-1 text-purple-300">/</span>
            {lowest.score}<span className="text-[10px] font-normal text-purple-400">({lowest.subject})</span>
          </div>
        </div>

        <div className="rounded-lg bg-amber-50/80 px-3 py-3">
          <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium mb-1">
            <span>🏆</span> 最佳排名
          </div>
          {bestRank ? (
            <div className="text-sm font-bold text-amber-700 truncate">
              第{bestRank.class_rank}名
              <span className="block text-[10px] font-normal text-amber-400 truncate">{bestRank.exam_name}</span>
            </div>
          ) : (
            <div className="text-sm font-normal text-amber-500/70">暂无排名数据</div>
          )}
        </div>
      </div>

      <div className={clsx(!compact && 'border-t border-slate-100 pt-5')}>
        {!compact && (
          <h4 className="mb-3 text-sm font-semibold text-slate-700">各科成绩</h4>
        )}

        <div className="space-y-3">
          {[...subjectGroups.entries()].map(([subject, records]) => {
            const latest = records[records.length - 1];
            const fullScore = latest.full_score || 100;
            const percentage = Math.min((latest.score / fullScore) * 100, 100);
            const colorInfo = getScoreColor(latest.score);

            return (
              <div key={subject}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={clsx('text-sm font-semibold shrink-0', colorInfo.text)}>
                      {subject}
                    </span>
                    <span className="text-sm font-bold text-slate-800">{latest.score}</span>
                    <span className="text-[11px] text-slate-400">/{fullScore}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 truncate ml-2">{latest.exam_name}</span>
                </div>

                <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={clsx('h-2 rounded-full transition-all duration-500', colorInfo.bg)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {records.length >= 2 && (
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    <span className="text-[11px] text-slate-500">趋势:</span>
                    {records.slice(-3).map((rec, idx) => {
                      if (idx === 0) {
                        return (
                          <span key={rec.id} className="text-[11px] font-medium text-slate-600">
                            {rec.score}
                          </span>
                        );
                      }
                      const prev = records[records.length - 1 - (idx - 1)]?.score ?? rec.score;
                      if (prev === rec.score) {
                        return (
                          <span key={rec.id} className="text-[11px] text-slate-400">
                            → {rec.score}
                          </span>
                        );
                      }
                      const trend = getTrendArrow(prev, rec.score);
                      return (
                        <span key={rec.id} className={clsx('text-[11px] font-medium', trend.color)}>
                          {trend.symbol} {rec.score}
                          <span className="text-[10px] text-slate-400">({trend.diff > 0 ? '+' : ''}{trend.diff})</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ExamAnalyzer;
