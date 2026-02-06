import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={[
          'w-full h-8 px-3 text-[13px] appearance-none',
          'bg-[#0d1117] border border-[#1e293b] rounded-md',
          'text-slate-200',
          'transition-all duration-150',
          'hover:border-slate-500/50',
          'focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15',
          'bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E")]',
          'bg-[length:12px] bg-[position:right_10px_center] bg-no-repeat pr-8',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Select.displayName = 'Select';
