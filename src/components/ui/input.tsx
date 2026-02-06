import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'w-full h-8 px-3 text-[13px]',
          'bg-[#0d1117] border border-[#1e293b] rounded-md',
          'text-slate-200 placeholder:text-slate-600',
          'transition-all duration-150',
          'hover:border-slate-500/50',
          'focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
