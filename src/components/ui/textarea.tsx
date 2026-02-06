import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={[
          'w-full px-3 py-2 text-[13px]',
          'bg-[#0d1117] border border-[#1e293b] rounded-md',
          'text-slate-200 placeholder:text-slate-600',
          'font-mono leading-relaxed resize-y min-h-[120px]',
          'transition-all duration-150',
          'hover:border-slate-500/50',
          'focus:outline-none focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/15',
          className,
        ].join(' ')}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
