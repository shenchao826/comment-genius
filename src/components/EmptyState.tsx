
import { clsx } from 'clsx';

interface ActionConfig {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ActionConfig;
  className?: string;
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center py-16 px-6 rounded-xl',
        'bg-gradient-to-b from-slate-50 to-gray-50',
        className
      )}
    >
      {icon && (
        <div className="text-5xl mb-4 opacity-70">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-700 mb-2 text-center">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-slate-400 text-center max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className={clsx(
            'px-5 py-2 text-sm font-medium rounded-lg transition-all duration-200',
            'active:scale-[0.98]',
            action.variant === 'secondary'
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
