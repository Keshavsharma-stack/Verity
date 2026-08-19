import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, rightElement, ...props }, ref) => {
    return (
      <div className="relative">
        <input
          className={cn(
            "flex h-10 w-full rounded-lg border border-zinc-800 bg-[#09090c] px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-inner focus:outline-none focus:ring-2 focus:ring-red-500/80 focus:border-red-500/60 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-150",
            rightElement && "pr-11",
            error && "border-red-600/80 focus:ring-red-600 focus:border-red-600 bg-red-950/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-0 top-0 h-10 px-3 flex items-center justify-center">
            {rightElement}
          </div>
        )}
        {error && (
          <p className="mt-1.5 text-xs text-red-400 font-medium">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5",
        className
      )}
      {...props}
    />
  )
);
Label.displayName = "Label";
