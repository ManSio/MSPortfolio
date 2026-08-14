import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'default' | 'accent' | 'primary' | 'success' | 'warn' | 'danger';

const tones: Record<Tone, string> = {
  default: 'bg-surface-2 text-muted border-line',
  accent: 'bg-accent/10 text-accent border-accent/30',
  primary: 'bg-primary/10 text-blue-600 border-primary/30 dark:text-blue-400',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400',
};

export function Badge({
  tone = 'default',
  className,
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
