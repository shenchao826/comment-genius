import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({ className, width, height, rounded = 'md' }: SkeletonProps) {
  const roundedMap = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={clsx(
        'bg-slate-100 animate-pulse',
        roundedMap[rounded],
        className
      )}
      style={{ width, height }}
    />
  );
}

interface SkeletonCardProps {
  className?: string;
  showAvatar?: boolean;
  lines?: number;
}

export function SkeletonCard({ className, showAvatar = true, lines = 3 }: SkeletonCardProps) {
  return (
    <div className={clsx('bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4', className)}>
      {showAvatar && (
        <div className="flex items-center gap-3">
          <Skeleton width="40px" height="40px" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton width="120px" height="16px" rounded="sm" />
            <Skeleton width="80px" height="12px" rounded="sm" />
          </div>
          <Skeleton width="60px" height="24px" rounded="md" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            width={i === lines - 1 ? '60%' : `${85 + Math.random() * 15}%`}
            height="14px"
            rounded="sm"
          />
        ))}
      </div>
      <div className="pt-2 flex gap-2">
        <Skeleton width="70px" height="28px" rounded="md" />
        <Skeleton width="70px" height="28px" rounded="md" />
      </div>
    </div>
  );
}

interface SkeletonTableProps {
  className?: string;
  rows?: number;
  cols?: number;
}

export function SkeletonTable({ className, rows = 5, cols = 4 }: SkeletonTableProps) {
  return (
    <div className={clsx('w-full space-y-0 overflow-hidden rounded-xl border border-slate-200', className)}>
      <div className="flex gap-4 bg-slate-50 px-4 py-3 border-b border-slate-200">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`h-${i}`} width={`${100 / cols}%`} height="14px" rounded="sm" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 px-4 py-3 border-b border-slate-100 last:border-b-0">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`c-${r}-${c}`} width={`${100 / cols}%`} height="20px" rounded="sm" />
          ))}
        </div>
      ))}
    </div>
  );
}
