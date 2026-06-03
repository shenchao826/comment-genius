
interface PricingCardProps {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  features: string[];
  isPopular?: boolean;
  isCurrent?: boolean;
  onSelect: (planId: string) => void;
  loading?: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  id,
  name,
  price,
  originalPrice,
  period,
  features,
  isPopular = false,
  isCurrent = false,
  onSelect,
  loading = false
}) => {
  return (
    <div className={`
      relative rounded-2xl border-2 p-6 transition-all duration-300
      ${isPopular 
        ? 'border-blue-500 shadow-xl scale-105 bg-gradient-to-b from-blue-50 to-white' 
        : isCurrent 
          ? 'border-green-500 bg-green-50'
          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg'
      }
    `}>
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
            ⭐ 最受欢迎
          </span>
        </div>
      )}

      {/* Current Badge */}
      {isCurrent && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
            ✓ 当前方案
          </span>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-slate-900 mb-2">{name}</h3>
        
        <div className="flex items-end justify-center gap-1">
          <span className="text-4xl font-bold text-blue-600">¥{price}</span>
          <span className="text-slate-600 mb-1.5">/{period}</span>
        </div>

        {originalPrice && (
          <div className="mt-2">
            <span className="text-sm text-slate-400 line-through">¥{originalPrice}</span>
            <span className="ml-2 text-sm font-medium text-red-500">
              省{Math.round((1 - price / originalPrice) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Features List */}
      <ul className="space-y-3 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2">
            <svg
              className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                isCurrent ? 'text-green-500' : 'text-blue-500'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => !isCurrent && onSelect(id)}
        disabled={isCurrent || loading}
        className={`
          w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200
          ${isCurrent
            ? 'bg-green-100 text-green-700 cursor-not-allowed'
            : isPopular
              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
              : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
          }
          ${loading ? 'opacity-75 cursor-wait' : ''}
        `}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            处理中...
          </span>
        ) : isCurrent ? (
          '当前使用'
        ) : (
          '立即开通'
        )}
      </button>
    </div>
  );
};

export default PricingCard;
