import React from 'react';
import { cn } from '../../lib/utils';
import { ComplianceStatus } from '../../types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'crimson';
  status?: ComplianceStatus;
  className?: string;
  children?: React.ReactNode;
}

export function Badge({ className, variant = 'default', status, children, ...props }: BadgeProps) {
  let mappedVariant = variant;
  if (status) {
    if (status === 'COMPLIANT') mappedVariant = 'success';
    else if (status === 'EXPIRING') mappedVariant = 'warning';
    else if (status === 'NON_COMPLIANT') mappedVariant = 'danger';
    else if (status === 'PENDING_REVIEW') mappedVariant = 'neutral';
  }

  const variants = {
    default: 'bg-zinc-900/90 text-zinc-300 border border-zinc-800',
    crimson: 'bg-red-950/70 text-red-300 border border-red-800/60 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
    success: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50',
    warning: 'bg-amber-950/60 text-amber-400 border border-amber-800/50',
    danger: 'bg-red-950/80 text-red-400 border border-red-700/60 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    neutral: 'bg-zinc-900/80 text-zinc-400 border border-zinc-700/50',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide transition-colors',
        variants[mappedVariant],
        className
      )}
      {...props}
    >
      {children || (status && status.replace('_', ' '))}
    </span>
  );
}
