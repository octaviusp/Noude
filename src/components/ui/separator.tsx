interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({ orientation = 'vertical', className = '' }: SeparatorProps) {
  return (
    <div
      className={[
        'ui-separator',
        orientation === 'vertical' ? 'ui-separator--vertical' : 'ui-separator--horizontal',
        className,
      ].join(' ').trim()}
    />
  );
}
