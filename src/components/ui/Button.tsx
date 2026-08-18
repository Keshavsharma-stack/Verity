import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, asChild = false, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-zinc-100 text-zinc-900 hover:bg-white active:bg-zinc-200 border border-transparent shadow-sm',
      secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-600 border border-transparent',
      outline: 'bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700',
      ghost: 'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 border border-transparent shadow-sm',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    };

    const buttonClasses = cn(
      'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:pointer-events-none',
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
