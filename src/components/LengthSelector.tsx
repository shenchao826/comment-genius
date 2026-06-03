
interface LengthSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isPremium?: boolean;
}

const LENGTHS = [
  {
    id: 'concise',
    name: '精简版',
    range: '80-120字',
    icon: '📝',
    description: '适合日常快速沟通',
    premiumOnly: false
  },
  {
    id: 'standard',
    name: '标准版',
    range: '200-300字',
    icon: '📄',
    description: '最常用的标准长度',
    recommended: true,
    premiumOnly: false
  },
  {
    id: 'detailed',
    name: '详细版',
    range: '400-500字',
    icon: '📚',
    description: '适合期末正式评价',
    premiumOnly: true
  }
];

const LengthSelector: React.FC<LengthSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  isPremium = false
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        📏 评语长度
      </label>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {LENGTHS.map((length) => {
          const isSelected = value === length.id;
          const isLocked = length.premiumOnly && !isPremium;
          
          return (
            <button
              key={length.id}
              onClick={() => !isLocked && !disabled && onChange(length.id)}
              disabled={disabled || isLocked}
              className={`
                relative p-5 rounded-xl border-2 transition-all duration-200 text-left
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }
                ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {/* Recommended Badge */}
              {length.recommended && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  推荐
                </div>
              )}
              
              {/* Lock Icon */}
              {isLocked && (
                <div className="absolute top-2 right-2 text-yellow-500 text-sm">
                  🔒
                </div>
              )}
              
              {/* Header */}
              <div className="flex items-center gap-3 mb-2">
                <span className={`text-2xl ${isLocked ? 'grayscale' : ''}`}>
                  {length.icon}
                </span>
                <div>
                  <div className={`font-bold text-base ${
                    isSelected ? 'text-blue-700' : 'text-slate-900'
                  }`}>
                    {length.name}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {length.range}
                  </div>
                </div>
              </div>
              
              {/* Description */}
              <div className="text-sm text-slate-600">
                {length.description}
              </div>
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    已选择
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {!isPremium && (
        <p className="text-xs text-slate-500 mt-2">
          💡 详细版需升级到<span className="font-medium text-blue-600">专业版</span>解锁
        </p>
      )}
    </div>
  );
};

export default LengthSelector;
