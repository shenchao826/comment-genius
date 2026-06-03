
import { clsx } from 'clsx';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'slate';
  className?: string;
}

const sizeMap = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };
const colorMap = {
  primary: 'text-blue-600',
  white: 'text-white',
  slate: 'text-slate-400',
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'primary', className }) => (
  <svg className={clsx('animate-spin', sizeMap[size], colorMap[color], className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

interface PageLoadingProps {
  message?: string;
  icon?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({ message = '加载中...', icon = '🎓' }) => (
  <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center gap-4">
    <span className="text-4xl animate-bounce">{icon}</span>
    <Spinner size="lg" />
    <p className="text-sm text-slate-500 animate-pulse">{message}</p>
  </div>
);

interface InlineLoadingProps {
  message?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ message = '加载中...' }) => (
  <div className="flex items-center justify-center gap-3 py-8">
    <Spinner />
    <span className="text-sm text-slate-500">{message}</span>
  </div>
);

interface SkeletonLineProps {
  width?: string;
  height?: string;
  className?: string;
}

export const SkeletonLine: React.FC<SkeletonLineProps> = ({ width = '100%', height = '16px', className }) => (
  <div className={clsx('bg-slate-200 rounded animate-pulse', className)} style={{ width, height }} />
);

interface SkeletonCardProps {
  lines?: number;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ lines = 4 }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
    <SkeletonLine width="40%" height="20px" />
    {Array.from({ length: lines }).map((_, i) => (
      <SkeletonLine key={i} width={i === lines - 1 ? '60%' : `${85 + Math.random() * 15}%`} height="14px" />
    ))}
  </div>
);

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ rows = 5, cols = 4 }) => (
  <div className="w-full space-y-3">
    <div className="flex gap-4 pb-3 border-b border-slate-200">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLine key={`h-${i}`} width={`${100 / cols}%`} height="14px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={`r-${r}`} className="flex gap-4 py-2">
        {Array.from({ length: cols }).map((_, c) => (
          <SkeletonLine key={`c-${r}-${c}`} width={`${100 / cols}%`} height="36px" />
        ))}
      </div>
    ))}
  </div>
);
