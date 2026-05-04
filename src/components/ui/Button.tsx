'use client'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, children, className = '', disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]'

    const variants = {
      primary: 'bg-[var(--accent-primary)] text-white hover:bg-blue-600 focus:ring-blue-500 active:scale-95',
      secondary: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] focus:ring-blue-500',
      ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] focus:ring-[var(--border)]',
      danger: 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/30 hover:bg-[var(--danger)]/20 focus:ring-red-500',
      success: 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/30 hover:bg-[var(--success)]/20 focus:ring-green-500',
    }

    const sizes = {
      sm: 'text-sm px-3 py-1.5 min-h-[32px]',
      md: 'text-sm px-4 py-2 min-h-[40px]',
      lg: 'text-base px-6 py-3 min-h-[48px]',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
