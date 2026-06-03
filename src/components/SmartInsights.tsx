
import { clsx } from 'clsx';
import { runAlertRules, generateStudentInsights, StudentAlert, Insight } from '../utils/dataAnalytics';

interface SmartInsightsProps {
  studentData: {
    exams?: Array<any>;
    behaviors?: Array<any>;
    conversations?: Array<any>;
    homeVisits?: Array<any>;
    coverageCount?: number;
    totalDimensions?: number;
    lastUpdateDate?: string;
  };
  showAlerts?: boolean;
  showInsights?: boolean;
  className?: string;
}

const SmartInsights: React.FC<SmartInsightsProps> = ({
  studentData,
  showAlerts = true,
  showInsights = true,
  className,
}) => {
  const alerts = showAlerts ? runAlertRules(studentData) : [];
  const insights = showInsights ? generateStudentInsights(studentData) : [];

  if (alerts.length === 0 && insights.length === 0) {
    return null;
  }

  const severityColors = {
    danger: 'border-red-300 bg-red-50 text-red-800',
    warning: 'border-amber-300 bg-amber-50 text-amber-800',
    info: 'border-blue-300 bg-blue-50 text-blue-800',
  };

  const severityIcons = {
    danger: '🔴',
    warning: '🟡',
    info: '🔵',
  };

  const insightTypeConfig = {
    strength: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
    concern: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
    opportunity: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
    recommendation: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800' },
  };

  return (
    <div className={clsx('space-y-4', className)}>
      {/* 预警卡片 */}
      {alerts.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>⚡</span>
            智能预警 ({alerts.length})
          </h4>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.ruleId}
                className={clsx(
                  'rounded-lg border p-3 transition-all',
                  severityColors[alert.severity]
                )}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 text-base">{severityIcons[alert.severity]}</span>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm">{alert.title}</h5>
                    <p className="mt-0.5 text-xs opacity-90">{alert.description}</p>
                    <p className="mt-1 text-xs font-medium opacity-80">
                      💡 建议：{alert.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 智能洞察 */}
      {insights.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <span>💡</span>
            AI 洞察与建议 ({insights.length})
          </h4>
          <div className="space-y-2">
            {insights.map((insight, index) => {
              const config = insightTypeConfig[insight.type];
              return (
                <div
                  key={index}
                  className={clsx(
                    'rounded-lg border p-3 transition-all hover:shadow-md',
                    config.bg,
                    config.border,
                    config.text
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-base">{insight.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h5 className="font-medium text-sm">{insight.title}</h5>
                        {insight.actionable && (
                          <span className="inline-flex items-center rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium">
                            可操作
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs opacity-90">{insight.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartInsights;
