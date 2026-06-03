
interface UsageProgressProps {
  used: number;
  limit: number;
  label?: string;
  showResetTime?: boolean;
  resetTime?: Date;
  onUpgrade?: () => void;
}

const UsageProgress: React.FC<UsageProgressProps> = ({
  used,
  limit,
  label = '今日额度',
  showResetTime = true,
  resetTime,
  onUpgrade
}) => {
  const percentage = Math.min(Math.round((used / limit) * 100), 100);
  const remaining = Math.max(limit - used, 0);
  
  const getColorClass = () => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getTextColorClass = () => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-blue-600';
  };

  const formatResetTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-2">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <span className={`text-sm font-bold ${getTextColorClass()}`}>
            {used}/{limit}
          </span>
        </div>
        
        {showResetTime && resetTime && (
          <span className="text-xs text-slate-500">
            重置时间：{formatResetTime(resetTime)}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full ${getColorClass()} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Warning indicator when nearly full */}
        {percentage >= 90 && (
          <div className="absolute -right-1 top-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>

      {/* Status Text */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-600">
          剩余 <strong className={getTextColorClass()}>{remaining}</strong> 次
        </span>
        
        {percentage >= 80 && onUpgrade && (
          <button
            onClick={onUpgrade}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
          >
            升级解锁无限次数 →
          </button>
        )}
      </div>

      {/* Low quota warning */}
      {remaining <= 2 && remaining > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mt-2">
          <p className="text-xs text-yellow-800">
            ⚠️ 额度即将用完，升级到专业版可享受无限生成
          </p>
        </div>
      )}

      {/* Quota exhausted */}
      {remaining === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
          <p className="text-sm text-red-800 font-medium mb-2">
            😔 今日免费额度已用完
          </p>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="w-full px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
            >
              立即升级专业版 →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UsageProgress;
