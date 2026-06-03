
interface StyleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  isPremium?: boolean;
}

const STYLES = [
  {
    id: 'gentle',
    name: '温和鼓励',
    icon: '💝',
    description: '以肯定为主，委婉指出不足',
    recommended: true,
    premiumOnly: false
  },
  {
    id: 'formal',
    name: '正式严谨',
    icon: '📋',
    description: '平实叙述，优缺点都提及',
    recommended: false,
    premiumOnly: true
  },
  {
    id: 'humorous',
    name: '幽默亲切',
    icon: '😄',
    description: '轻松活泼，适当用比喻',
    recommended: false,
    premiumOnly: true
  },
  {
    id: 'objective',
    name: '客观中立',
    icon: '⚖️',
    description: '基于事实和数据说话',
    recommended: false,
    premiumOnly: true
  },
  {
    id: 'warm',
    name: '温暖亲切',
    icon: '☀️',
    description: '温暖真诚，富有感染力',
    recommended: false,
    premiumOnly: true
  }
];

const StyleSelector: React.FC<StyleSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  isPremium = false
}) => {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700">
        ✏️ 选择风格
      </label>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {STYLES.map((style) => {
          const isSelected = value === style.id;
          const isLocked = style.premiumOnly && !isPremium;
          
          return (
            <button
              key={style.id}
              onClick={() => !isLocked && !disabled && onChange(style.id)}
              disabled={disabled || isLocked}
              className={`
                relative p-4 rounded-xl border-2 transition-all duration-200 text-center
                ${isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md scale-105'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                }
                ${isLocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              `}
            >
              {/* Recommended Badge */}
              {style.recommended && (
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                  推荐
                </div>
              )}
              
              {/* Lock Icon for Premium */}
              {isLocked && (
                <div className="absolute top-2 right-2 text-yellow-500 text-sm">
                  🔒
                </div>
              )}
              
              {/* Icon */}
              <div className={`text-3xl mb-2 ${isLocked ? 'grayscale' : ''}`}>
                {style.icon}
              </div>
              
              {/* Name */}
              <div className={`font-medium text-sm ${
                isSelected ? 'text-blue-700' : 'text-slate-800'
              }`}>
                {style.name}
              </div>
              
              {/* Description */}
              <div className="text-xs text-slate-500 mt-1 hidden md:block">
                {style.description}
              </div>
              
              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-2 left-2 w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {!isPremium && (
        <p className="text-xs text-slate-500 mt-2">
          💡 部分风格需升级到<span className="font-medium text-blue-600">专业版</span>解锁
        </p>
      )}
    </div>
  );
};

export default StyleSelector;
