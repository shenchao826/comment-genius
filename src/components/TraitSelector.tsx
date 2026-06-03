import { useState, useMemo, type FC, Fragment } from 'react';
import { clsx } from 'clsx';
import { colors, components, motion } from '../config/design-tokens';
import {
  TRAITS,
  TRAIT_CATEGORIES,
  type TraitCategory,
  getTraitsByCategory,
  getPositiveTraits
} from '../data/traits-data';

interface TraitSelectorProps {
  selectedTraits: string[];
  onToggle: (traitId: string) => void;
  maxSelections?: number;
  showRecommendation?: boolean; // 是否显示智能推荐
}

const TraitSelector: FC<TraitSelectorProps> = ({
  selectedTraits,
  onToggle,
  maxSelections = components.tagChip.maxSelections,
  showRecommendation = true
}) => {
  const [activeCategory, setActiveCategory] = useState<TraitCategory>('attitude');

  // 将数据转换为组件需要的格式
  const categories = useMemo(() => {
    return Object.entries(TRAIT_CATEGORIES).map(([key, value]) => ({
      id: key,
      name: value.label,
      icon: value.icon,
      color: value.color,
      traits: getTraitsByCategory(key as TraitCategory)
    }));
  }, []);

  const activeTraits = useMemo(
    () => categories.find((cat) => cat.id === activeCategory)?.traits || [],
    [categories, activeCategory],
  );

  const isMaxReached = selectedTraits.length >= maxSelections;

  const isSelected = (traitId: string) => selectedTraits.includes(traitId);

  const isDisabled = (traitId: string) => isMaxReached && !isSelected(traitId);

  const handleTraitClick = (traitId: string) => {
    if (!isDisabled(traitId)) {
      onToggle(traitId);
    }
  };

  // 智能推荐功能
  const handleSmartRecommend = () => {
    if (selectedTraits.length > 0) return; // 已选择则不推荐
    
    const positiveTraits = getPositiveTraits();
    const recommendedCount = Math.min(3, maxSelections);
    
    // 随机选择3个不同类别的正面标签
    const shuffled = positiveTraits.sort(() => Math.random() - 0.5);
    const selected: string[] = [];
    
    for (const trait of shuffled) {
      if (!selected.includes(trait.category)) {
        selected.push(trait.id);
        if (selected.length >= recommendedCount) break;
      }
    }
    
    // 触发选择
    selected.forEach(id => onToggle(id));
  };

  const handleRemoveTrait = (traitId: string) => {
    onToggle(traitId);
  };

  const handleClearAll = () => {
    [...selectedTraits].forEach((traitId) => onToggle(traitId));
  };

  const getSelectedTraitName = (traitId: string): string => {
    const trait = TRAITS.find(t => t.id === traitId);
    return trait?.name || traitId;
  };

  const getSelectedTraitIcon = (traitId: string): string => {
    const trait = TRAITS.find(t => t.id === traitId);
    return trait?.icon || '🏷️';
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-[#1E293B]">
          📝 选择特点标签（至少选1个，最多{maxSelections}个）
        </div>
        
        {showRecommendation && selectedTraits.length === 0 && (
          <button
            onClick={handleSmartRecommend}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            ✨ 智能推荐
          </button>
        )}
      </div>

      {/* Category Tabs */}
      <div
        className={clsx('flex gap-1 overflow-x-auto pb-2 pr-4', 'scrollbar-hide')}
        style={{
          height: '36px',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id as TraitCategory)}
            className={clsx(
              'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
              activeCategory === category.id
                ? 'text-white shadow-md'
                : 'bg-transparent hover:bg-slate-100'
            )}
            style={
              activeCategory === category.id
                ? { backgroundColor: category.color }
                : { color: colors.slate[600] }
            }
          >
            <span className="mr-1">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* Traits Grid */}
      <div className="flex flex-wrap gap-2 mb-4">
        {activeTraits.map((trait) => (
          <button
            key={trait.id}
            onClick={() => handleTraitClick(trait.id)}
            disabled={isDisabled(trait.id)}
            title={trait.description}
            className={clsx(
              'relative inline-flex h-[40px] items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm transition-all group',
              isSelected(trait.id)
                ? 'border-transparent text-white shadow-sm scale-105'
                : clsx(
                    'bg-white hover:border-blue-300 hover:bg-blue-50 hover:-translate-y-px',
                    isDisabled(trait.id) &&
                      'opacity-45 cursor-not-allowed hover:bg-white hover:border-slate-200 hover:translate-y-0',
                  ),
            )}
            style={
              isSelected(trait.id)
                ? { 
                    backgroundColor: TRAIT_CATEGORIES[trait.category]?.color || colors.primary[600], 
                    borderColor: TRAIT_CATEGORIES[trait.category]?.color || colors.primary[600],
                    transitionTimingFunction: motion.easing.spring, 
                    transitionDuration: '100ms' 
                  }
                : !isDisabled(trait.id)
                  ? { 
                      borderColor: colors.slate[200], 
                      color: trait.positive === false ? '#EF4444' : colors.slate[700],
                      transitionTimingFunction: motion.easing.spring, 
                      transitionDuration: '150ms' 
                  }
                  : { borderColor: colors.slate[200], color: colors.slate[700] }
            }
          >
            {isSelected(trait.id) && <span className="text-white text-xs mr-0.5">✓</span>}
            <span className="text-base">{trait.icon}</span>
            <span>{trait.name}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {trait.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
            </div>
          </button>
        ))}
      </div>

      {/* Selected Tags Bar */}
      {selectedTraits.length > 0 && (
        <div
          className={clsx(
            'sticky bottom-0 flex items-center justify-between rounded-lg px-4 py-2.5 shadow-md',
            'bg-gradient-to-r from-blue-50 to-indigo-50',
          )}
          style={{ zIndex: 10 }}
        >
          <div className="flex flex-wrap items-center gap-1 text-sm text-blue-700">
            <span className="font-medium">✓ 已选:</span>
            {selectedTraits.map((traitId, index) => (
              <Fragment key={traitId}>
                <button
                  onClick={() => handleRemoveTrait(traitId)}
                  className={clsx(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[#DBEAFE]',
                  )}
                >
                  <span>{getSelectedTraitIcon(traitId)}</span>
                  <span>{getSelectedTraitName(traitId)}</span>
                  <span className="text-xs text-[#64748B] hover:text-[#DC2626]">×</span>
                </button>
                {index < selectedTraits.length - 1 && <span className="text-[#93C5FD]">·</span>}
              </Fragment>
            ))}
            <span className="ml-1 font-normal text-[#64748B]">
              ({selectedTraits.length}/{maxSelections})
            </span>
          </div>

          <button
            onClick={handleClearAll}
            className={clsx(
              'ml-3 text-sm font-medium underline-offset-4 transition-colors',
              'text-blue-600 hover:text-blue-800 hover:underline',
            )}
          >
            清空
          </button>
        </div>
      )}

      {/* Empty State Hint */}
      {selectedTraits.length === 0 && !isMaxReached && (
        <div className="mt-2 text-xs text-slate-500 italic">
          💡 提示：点击上方分类切换不同类型的特点标签
        </div>
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default TraitSelector;
