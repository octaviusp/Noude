import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={[
          'w-full h-8 px-2.5 text-[13px] appearance-none',
          'bg-slate-800/60 border border-slate-600/40 rounded-md',
          'text-slate-200',
          'transition-colors duration-150',
          'focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
          'bg-[length:12px] bg-[position:right_8px_center] bg-no-repeat pr-7',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Select.displayName = 'Select';
