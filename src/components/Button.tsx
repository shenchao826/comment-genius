
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'text' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) => {
  const baseStyles = clsx(
    'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none',
    'disabled:cursor-not-allowed',
  );

  // 规格书§5.2.1 - 6种变体精确实现
  const variants = {
    // 变体A：主按钮（Primary）
    primary: clsx(
      'bg-[#2563EB]', // --color-primary-600
      'text-white',
      `rounded-lg`, // --radius-lg (8px)
      size === 'md' ? 'h-[48px] px-6' : size === 'lg' ? 'h-[52px] px-8' : 'h-[40px] px-4',
      'text-base font-medium', // --text-base, weight:500
      'hover:bg-[#1D4ED8]', // hover: --color-primary-700
      'hover:shadow-sm', // hover: --shadow-sm
      'active:bg-[#1E40AF]', // active: --color-primary-800
      'active:shadow-inner', // active: --shadow-inner
      'disabled:bg-[#93C5FD] disabled:text-white/70 disabled:opacity-65',
      !disabled && 'cursor-pointer',
    ),

    // 变体B：次按钮（Secondary）
    secondary: clsx(
      'bg-white',
      'border-[1.5px] border-[#BFDBFE]', // border: --color-primary-200
      'text-[#2563EB]', // text: --color-primary-600
      `rounded-lg`,
      size === 'md' ? 'h-[48px] px-6' : size === 'lg' ? 'h-[52px] px-8' : 'h-[40px] px-4',
      'text-base font-medium',
      'hover:bg-[#EFF6FF]', // hover bg: --color-primary-50
      'hover:border-[#93C5FD]', // hover border: --color-primary-300
      'active:bg-[#DBEAFE]', // active bg: --color-primary-100
      'disabled:border-[#E2E8F0] disabled:text-[#94A3B8]',
      !disabled && 'cursor-pointer',
    ),

    // 变体C：幽灵按钮（Ghost）
    ghost: clsx(
      'bg-transparent',
      'text-[#2563EB]', // text: --color-primary-600
      `rounded-lg`,
      size === 'md' ? 'h-[44px] px-4' : size === 'lg' ? 'h-[48px] px-6' : 'h-[36px] px-3',
      'text-sm font-medium',
      'hover:bg-[#EFF6FF]', // hover bg: --color-primary-50
      'active:bg-[#DBEAFE]', // active bg: --color-primary-100
      !disabled && 'cursor-pointer',
    ),

    // 变体D：危险按钮（Destructive）
    destructive: clsx(
      'bg-white',
      'border-[1.5px] border-[#DC2626]', // border: --color-error
      'text-[#DC2626]', // text: --color-error
      `rounded-lg`,
      size === 'md' ? 'h-[48px] px-6' : size === 'lg' ? 'h-[52px] px-8' : 'h-[40px] px-4',
      'text-base font-medium',
      'hover:bg-[#FEE2E2]', // hover bg: --color-error-light
      'active:bg-[#FECACA]', // active bg: 更深的红色
      !disabled && 'cursor-pointer',
    ),

    // 变体E：文本按钮（Text Link）
    text: clsx(
      'bg-transparent',
      'text-[#2563EB]', // text: --color-primary-600
      'underline-offset-4',
      'text-sm font-normal',
      'hover:text-[#1E40AF]', // hover: --color-primary-800
      'hover:underline',
      !disabled && 'cursor-pointer',
    ),

    // 变体F：图标按钮（Icon Only）
    icon: clsx(
      'bg-transparent',
      `rounded-full`, // --radius-full (圆形)
      'w-9 h-9', // 36×36px
      'flex items-center justify-center',
      'text-[#64748B]', // text: --color-slate-500
      'hover:bg-[#F1F5F9]', // hover bg: --color-slate-100
      'active:bg-[#E2E8F0]', // active bg: --color-slate-200
      !disabled && 'cursor-pointer',
    ),
  };

  const classes = twMerge(clsx(baseStyles, variants[variant]), className);

  return (
    <button className={classes} disabled={loading || disabled} {...props}>
      {/* Loading Spinner - 规格书要求：白色, 18px */}
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-[18px] w-[18px]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}

      {/* Loading文字替换 - 规格书要求：防止布局抖动 */}
      {loading && (
        <span className={variant === 'primary' ? '' : 'text-[#2563EB]'}>
          {variant === 'primary' ? 'AI思考中...' : '处理中...'}
        </span>
      )}

      {!loading && children}
    </button>
  );
};

export default Button;
