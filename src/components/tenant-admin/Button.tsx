import React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--clinical-blue)] text-white hover:opacity-90',
  secondary: 'bg-[var(--surface-subtle)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--hover-bg)]',
  danger: 'bg-red-600 text-white hover:opacity-90',
  ghost: 'text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  fullWidth = false,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`
        rounded-lg font-medium transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      <span className="inline-flex items-center gap-2">
        {isLoading && (
          <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {icon && !isLoading && <span>{icon}</span>}
        {children}
      </span>
    </button>
  )
}
