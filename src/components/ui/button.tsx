import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'primary' | 'destructive' | 'ghost' | 'outline';
type Size = 'sm' | 'default' | 'lg';

const variantClasses: Record<Variant, string> = {
  default:
    'bg-slate-700/60 border-slate-600/50 text-slate-200 hover:bg-slate-600/70 hover:border-slate-500/60',
  primary:
    'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 hover:border-indigo-400',
  destructive:
    'bg-red-900/30 border-red-700/50 text-red-400 hover:bg-red-900/50 hover:border-red-600/60',
  ghost:
    'bg-transparent border-transparent text-slate-400 hover:bg-slate-700/50 hover:text-slate-200',
  outline:
    'bg-transparent border-slate-600/50 text-slate-300 hover:bg-slate-700/40 hover:border-slate-500/60',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  default: 'h-8 px-3 text-[13px] gap-2 rounded-lg',
  lg: 'h-9 px-4 text-sm gap-2 rounded-lg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', className = '', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center justify-center border font-medium',
          'transition-all duration-150 ease-out cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          'whitespace-nowrap select-none',
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
