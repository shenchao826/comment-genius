
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface BaseInputProps {
  prefixIcon?: React.ReactNode;
  showCount?: boolean;
  maxLength?: number;
  error?: string;
  disabled?: boolean;
}

interface InputProps
  extends BaseInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'size'> {}

const Input: React.FC<InputProps> = ({
  prefixIcon,
  showCount = false,
  maxLength,
  error,
  disabled = false,
  className,
  value,
  onChange,
  ...props
}) => {
  const hasPrefix = !!prefixIcon;

  const baseStyles = clsx(
    'w-full bg-white',
    'border-[1.5px] border-solid',
    error ? 'border-[#DC2626]' : 'border-[#E2E8F0]',
    'rounded-lg',
    'h-[46px]',
    'text-base',
    hasPrefix ? 'pl-[40px]' : 'pl-3',
    'pr-3',
    'transition-all duration-150',
    'placeholder:text-[#94A3B8]',
    disabled && 'bg-[#F8FAFC] border-[#CBD5E1] cursor-not-allowed',
    !disabled &&
      !error &&
      'focus:border-[#3B82F6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] focus:outline-none',
    !disabled &&
      error &&
      'focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)] focus:outline-none',
  );

  const displayValue = typeof value === 'string' ? value : String(value ?? '');
  const charCount = displayValue.length;

  return (
    <div className="relative w-full">
      {prefixIcon && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#94A3B8]">
          {prefixIcon}
        </span>
      )}
      <input
        className={twMerge(baseStyles, className)}
        value={value}
        onChange={onChange}
        disabled={disabled}
        maxLength={maxLength}
        {...props}
      />
      {showCount && maxLength && (
        <span className="absolute right-3 bottom-1.5 text-xs text-[#94A3B8] pointer-events-none">
          {charCount}/{maxLength}
        </span>
      )}
      {error && !disabled && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
};

interface TextareaProps
  extends
    BaseInputProps,
    Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix' | 'size'> {}

const Textarea: React.FC<TextareaProps> = ({
  prefixIcon,
  showCount = false,
  maxLength,
  error,
  disabled = false,
  className,
  value,
  onChange,
  ...props
}) => {
  const hasPrefix = !!prefixIcon;

  const baseStyles = clsx(
    'w-full bg-white',
    'border-[1.5px] border-solid',
    error ? 'border-[#DC2626]' : 'border-[#E2E8F0]',
    'rounded-lg',
    'min-h-[80px]',
    'max-h-[200px]',
    'text-base',
    hasPrefix ? 'pt-3 pl-[40px]' : 'p-3',
    'transition-all duration-150 resize-y',
    'placeholder:text-[#94A3B8]',
    disabled && 'bg-[#F8FAFC] border-[#CBD5E1] cursor-not-allowed',
    !disabled &&
      !error &&
      'focus:border-[#3B82F6] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] focus:outline-none',
    !disabled &&
      error &&
      'focus:border-[#DC2626] focus:shadow-[0_0_0_3px_rgba(220,38,38,0.12)] focus:outline-none',
  );

  const displayValue = typeof value === 'string' ? value : String(value ?? '');
  const charCount = displayValue.length;

  return (
    <div className="relative w-full">
      {prefixIcon && (
        <span className="absolute left-3 top-3 pointer-events-none text-[#94A3B8]">
          {prefixIcon}
        </span>
      )}
      <textarea
        className={twMerge(baseStyles, className)}
        value={value}
        onChange={onChange}
        disabled={disabled}
        maxLength={maxLength}
        {...props}
      />
      {showCount && maxLength && (
        <span className="absolute right-3 bottom-1.5 text-xs text-[#94A3B8] pointer-events-none">
          {charCount}/{maxLength}
        </span>
      )}
      {error && !disabled && <p className="mt-1 text-xs text-[#DC2626]">{error}</p>}
    </div>
  );
};

export { Input, Textarea };
export default Input;
