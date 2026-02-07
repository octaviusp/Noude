import { forwardRef, type ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'primary' | 'destructive' | 'ghost' | 'outline';
type Size = 'sm' | 'default' | 'lg' | 'icon';

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
          'ui-button',
          `ui-button--${variant}`,
          `ui-button--${size}`,
          className,
        ].join(' ').trim()}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
