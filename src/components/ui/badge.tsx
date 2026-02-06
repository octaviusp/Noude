import type { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'amber' | 'indigo' | 'green' | 'red' | 'purple' | 'slate';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-700/50 text-slate-300 border-slate-600/30',
  amber: 'bg-amber-900/30 text-amber-400 border-amber-700/30',
  indigo: 'bg-indigo-900/30 text-indigo-400 border-indigo-700/30',
  green: 'bg-emerald-900/30 text-emerald-400 border-emerald-700/30',
  red: 'bg-red-900/30 text-red-400 border-red-700/30',
  purple: 'bg-purple-900/30 text-purple-400 border-purple-700/30',
  slate: 'bg-slate-800/50 text-slate-400 border-slate-600/30',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5',
        'text-[10px] font-medium leading-none',
        'border rounded',
        variantClasses[variant],
        className,
      ].join(' ')}
      {...props}
    />
  );
}
