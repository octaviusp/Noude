import type { HTMLAttributes } from 'react';

type BadgeVariant = 'default' | 'amber' | 'indigo' | 'green' | 'red' | 'purple' | 'slate' | 'blue' | 'sky';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <span
      className={['ui-badge', `ui-badge--${variant}`, className].join(' ').trim()}
      {...props}
    />
  );
}
