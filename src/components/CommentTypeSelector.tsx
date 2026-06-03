
interface CommentTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isPremium?: boolean;
}

const COMMENT_TYPES = [
  {
    id: 'summary',
    name: '期末总结',
    icon: '📊',
    description: '本学期回顾式综合评价',
    usage: '期末/学末',
    premiumOnly: false,
    category: '常规类型'
  },
  {
    id: 'encouragement',
    name: '日常鼓励',
    icon: '🌟',
    description: '正向激励，突出优点进步',
    usage: '日常/表扬时',
    premiumOnly: false,
    category: '常规类型'
  },
  {
    id: 'improvement',
    name: '改进建议',
    icon: '💪',
    description: '指出问题并提供建设性意见',
    usage: '需要改进时',
    premiumOnly: true,
    category: '高级类型'
  },
  {
    id: 'parent',
    name: '家长沟通',
    icon: '👨‍👩‍👧',
    description: '适合向家长汇报的语言风格',
    usage: '家长会/微信群',
    premiumOnly: true,
    category: '高级类型'
  },
  {
    id: 'midterm',
    name: '期中反馈',
    icon: '📝',
    description: '半学期阶段性评价与建议',
    usage: '期中考试后',
    premiumOnly: true,
    category: '高级类型'
  },
  {
    id: 'single_subject',
    name: '单科评语',
    icon: '📐',
    description: '聚焦某一学科的专业评价',
    usage: '科任教师用',
    premiumOnly: true,
    category: '高级类型'
  },
  {
    id: 'growth_report',
    name: '成长简报',
    icon: '📈',
    description: '结构化学期成长报告',
    usage: '家长会/档案',
    premiumOnly: true,
    category: '高级类型'
  }
];

const CommentTypeSelector: React.FC<CommentTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  isPremium = false
}) => {
  const regularTypes = COMMENT_TYPES.filter(t => t.category === '常规类型');
  const advancedTypes = COMMENT_TYPES.filter(t => t.category === '高级类型');

  return (
    <div className="space-y-4">
      <label className="block text-sm font-semibold text-slate-700">
        📋 评语类型
      </label>
      
      {/* Regular Types */}
      <div>
        <h4 className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-2">
          常规类型
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {regularTypes.map((type) => {
            const isSelected = value === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => !disabled && onChange(type.id)}
                disabled={disabled}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200 text-center
                  ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                  ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                `}
              >
                <div className="text-2xl mb-2">{type.icon}</div>
                <div className={`font-medium text-sm ${
                  isSelected ? 'text-blue-700' : 'text-slate-800'
                }`}>
                  {type.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">{type.usage}</div>
                
                {isSelected && (
                  <div className="absolute top-2 left-2 w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Types */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h4 className="text-xs font-medium text-slate-600 uppercase tracking-wider">
            高级类型
          </h4>
          {!isPremium && (
            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">
              🔒 专业版专属
            </span>
          )}
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {advancedTypes.map((type) => {
            const isSelected = value === type.id;
            const isLocked = type.premiumOnly && !isPremium;
            
            return (
              <button
                key={type.id}
                onClick={() => !isLocked && !disabled && onChange(type.id)}
                disabled={disabled || isLocked}
                className={`
                  relative p-3 rounded-lg border transition-all duration-200 text-center
                  ${isSelected
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                  }
                  ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                `}
              >
                {isLocked && (
                  <div className="absolute top-1 right-1 text-yellow-500 text-xs">
                    🔒
                  </div>
                )}
                
                <div className={`text-xl mb-1 ${isLocked ? 'grayscale' : ''}`}>
                  {type.icon}
                </div>
                <div className={`font-medium text-xs ${
                  isSelected ? 'text-purple-700' : 'text-slate-800'
                }`}>
                  {type.name}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">{type.usage}</div>
              </button>
            );
          })}
        </div>
      </div>

      {!isPremium && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-3">
          <p className="text-sm text-purple-800">
            💎 升级到<strong>专业版</strong>可使用全部 7 种评语类型，
            包括期中反馈、单科评语、成长简报等专业模板。
          </p>
          <button
            onClick={() => window.location.href = '/membership'}
            className="mt-2 text-sm text-purple-600 hover:text-purple-800 font-medium underline"
          >
            了解专业版权益 →
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentTypeSelector;
