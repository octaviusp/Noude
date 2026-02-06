interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Separator({ orientation = 'vertical', className = '' }: SeparatorProps) {
  return (
    <div
      className={[
        'bg-[#1e293b] shrink-0',
        orientation === 'vertical' ? 'w-px h-6 mx-1' : 'h-px w-full my-2',
        className,
      ].join(' ')}
    />
  );
}
