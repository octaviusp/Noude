import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          'w-full px-2.5 py-2 text-[13px]',
          'bg-slate-800/60 border border-slate-600/40 rounded-md',
          'text-slate-200 placeholder:text-slate-500',
          'font-mono leading-relaxed resize-y min-h-[120px]',
          'transition-colors duration-150',
          'focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
