import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'w-full h-8 px-2.5 text-[13px]',
          'bg-slate-800/60 border border-slate-600/40 rounded-md',
          'text-slate-200 placeholder:text-slate-500',
          'transition-colors duration-150',
          'focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';
