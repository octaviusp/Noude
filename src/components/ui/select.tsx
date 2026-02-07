import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={['ui-select', className].join(' ').trim()}
        {...props}
      />
    );
  }
);

Select.displayName = 'Select';
