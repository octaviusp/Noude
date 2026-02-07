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
        'ui-switch',
        checked ? 'is-checked' : '',
        className,
      ].join(' ').trim()}
    >
      <span className="ui-switch-thumb" />
    </button>
  );
}
