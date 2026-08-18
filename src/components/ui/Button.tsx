import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'crimson';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, asChild = false, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-red-600 via-rose-600 to-red-500 hover:from-red-500 hover:via-rose-500 hover:to-red-400 text-white font-semibold shadow-lg shadow-red-950/80 hover:shadow-red-600/30 border border-red-500/40 active:scale-[0.98]',
      crimson: 'bg-red-600 hover:bg-red-500 text-white font-semibold shadow-md shadow-red-900/50 border border-red-400/30 active:scale-[0.98]',
      secondary: 'bg-zinc-900/90 text-zinc-100 hover:bg-zinc-800 hover:text-white hover:border-red-500/40 active:bg-zinc-800 border border-zinc-800 backdrop-blur-sm',
      outline: 'bg-black/40 text-zinc-300 hover:text-white hover:bg-red-950/20 hover:border-red-500/50 border border-zinc-800 transition-all backdrop-blur-sm',
      ghost: 'bg-transparent text-zinc-400 hover:text-red-400 hover:bg-red-950/20 active:bg-red-950/30',
      danger: 'bg-gradient-to-r from-red-700 to-rose-800 text-white hover:from-red-600 hover:to-rose-700 active:bg-red-900 border border-red-600/50 shadow-lg shadow-red-950/80',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs font-medium tracking-wide',
      md: 'px-4 py-2 text-sm font-medium',
      lg: 'px-6 py-2.5 text-base font-semibold',
    };

    const buttonClasses = cn(
      'inline-flex items-center justify-center rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
      variants[variant],
      sizes[size],
      className
    );

    if (asChild) {
      return (
        <Slot
          ref={ref}
          disabled={disabled || isLoading}
          className={buttonClasses}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={buttonClasses}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
