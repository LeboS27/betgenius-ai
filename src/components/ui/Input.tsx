'use client'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-3 rounded-xl text-sm
            bg-[var(--bg-tertiary)] border
            ${error ? 'border-[var(--danger)] focus:ring-[var(--danger)]' : 'border-[var(--border)] focus:ring-[var(--accent-primary)]'}
            text-[var(--text-primary)] placeholder-[var(--text-muted)]
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-colors duration-200
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        {hint && !error && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'
