import { useState, type FC } from 'react';
import { clsx } from 'clsx';
import { colors, motion } from '../config/design-tokens';
import { CLASS_ROLES, ROLE_CATEGORIES, type ClassRole, type RoleCategory, getRolesByCategory } from '../data/class-roles';

interface RoleSelectorProps {
  selectedRole: string | null;
  onSelect: (roleId: string | null) => void;
}

const RoleSelector: FC<RoleSelectorProps> = ({ selectedRole, onSelect }) => {
  const [activeCategory, setActiveCategory] = useState<RoleCategory>('leadership');

  const categories = Object.entries(ROLE_CATEGORIES).map(([key, value]) => ({
    id: key,
    name: value.label,
    icon: value.icon,
    color: value.color,
    roles: getRolesByCategory(key as RoleCategory),
  }));

  const activeRoles = categories.find((cat) => cat.id === activeCategory)?.roles || [];

  const isSelected = (roleId: string) => selectedRole === roleId;

  const handleRoleClick = (roleId: string) => {
    if (isSelected(roleId)) {
      onSelect(null);
    } else {
      onSelect(roleId);
    }
  };

  const handleClear = () => {
    onSelect(null);
  };

  const getSelectedRoleInfo = (): ClassRole | undefined => {
    if (!selectedRole) return undefined;
    return CLASS_ROLES.find((r) => r.id === selectedRole);
  };

  const selectedInfo = getSelectedRoleInfo();

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-medium text-[#1E293B]">
          🎯 班级职务（可选，单选）
        </div>
        {selectedRole && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-red-600 font-medium transition-colors"
          >
            清除选择
          </button>
        )}
      </div>

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
            onClick={() => setActiveCategory(category.id as RoleCategory)}
            className={clsx(
              'flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200',
              activeCategory === category.id
                ? 'text-white shadow-md'
                : 'bg-transparent hover:bg-slate-100',
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

      <div className="flex flex-wrap gap-2 mb-3">
        {activeRoles.map((role) => (
          <button
            key={role.id}
            onClick={() => handleRoleClick(role.id)}
            title={role.description}
            className={clsx(
              'relative inline-flex h-[40px] items-center gap-1.5 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm transition-all group',
              isSelected(role.id)
                ? 'border-transparent text-white shadow-sm scale-105'
                : 'bg-white hover:border-blue-300 hover:bg-blue-50 hover:-translate-y-px',
            )}
            style={
              isSelected(role.id)
                ? {
                    backgroundColor: ROLE_CATEGORIES[role.category]?.color || colors.primary[600],
                    borderColor: ROLE_CATEGORIES[role.category]?.color || colors.primary[600],
                    transitionTimingFunction: motion.easing.spring,
                    transitionDuration: '100ms',
                  }
                : {
                    borderColor: colors.slate[200],
                    color: colors.slate[700],
                    transitionTimingFunction: motion.easing.spring,
                    transitionDuration: '150ms',
                  }
            }
          >
            {isSelected(role.id) && <span className="text-white text-xs mr-0.5">✓</span>}
            <span className="text-base">{role.icon}</span>
            <span>{role.name}</span>

            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {role.description}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800" />
            </div>
          </button>
        ))}
      </div>

      {selectedInfo && selectedInfo.promptHint && (
        <div
          className="rounded-lg px-3 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200"
        >
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">{selectedInfo.icon}</span>
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-1">
                已选：{selectedInfo.name} — {selectedInfo.description}
              </p>
              <p className="text-xs text-amber-700 leading-relaxed">
                {selectedInfo.promptHint}
              </p>
            </div>
          </div>
        </div>
      )}

      {!selectedRole && (
        <div className="mt-1 text-xs text-slate-400 italic">
          💡 不选择则按普通同学生成评语；选择职务后 AI 会结合职务特点生成针对性评语
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

export default RoleSelector;
