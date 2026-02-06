interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export function Switch({ checked, onCheckedChange, className = '' }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center',
        'rounded-full border transition-all duration-200',
        checked
          ? 'bg-emerald-500/80 border-emerald-400/30'
          : 'bg-slate-700/60 border-slate-600/30 hover:bg-slate-600/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
        className,
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm',
          'transition-all duration-200',
          checked
            ? 'translate-x-[18px] bg-white'
            : 'translate-x-[3px] bg-slate-400',
        ].join(' ')}
      />
    </button>
  );
}
