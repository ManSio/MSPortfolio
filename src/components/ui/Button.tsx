import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'accent';

const styles: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm',
  accent: 'bg-accent text-ink hover:opacity-90 shadow-sm',
  secondary: 'bg-surface-2 text-paper border border-line hover:border-accent/60',
  ghost: 'text-paper/80 hover:text-paper hover:bg-surface-2',
  outline: 'border border-line text-paper hover:border-accent/60 hover:text-accent',
};

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer',
        styles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
