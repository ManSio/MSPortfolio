import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'default' | 'accent' | 'primary' | 'success' | 'warn' | 'danger';

const tones: Record<Tone, string> = {
  default: 'bg-surface-2 text-paper/80 border-line',
  accent: 'bg-accent/10 text-accent border-accent/30',
  primary: 'bg-primary/10 text-blue-400 border-primary/30',
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  warn: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/10 text-red-400 border-red-500/30',
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
