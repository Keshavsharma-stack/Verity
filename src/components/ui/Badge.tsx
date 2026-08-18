import React from 'react';
import { cn } from '../../lib/utils';
import { ComplianceStatus } from '../../types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'neutral';
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
    default: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
    success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    danger: 'bg-red-500/10 text-red-500 border border-red-500/20',
    neutral: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[mappedVariant],
        className
      )}
      {...props}
    >
      {children || (status && status.replace('_', ' '))}
    </span>
  );
}
