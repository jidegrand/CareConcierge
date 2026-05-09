import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  interactive?: boolean
}

export function Card({ children, className = '', interactive = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 ${
        interactive ? 'hover:shadow-md transition-shadow cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  description?: string
  onClick?: () => void
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  trendValue,
  description,
  onClick,
}: StatCardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-[var(--text-secondary)]',
  }

  return (
    <Card interactive={!!onClick} className={onClick ? 'cursor-pointer' : ''}>
      <div onClick={onClick} className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-3xl font-bold text-[var(--text-primary)]">
              {icon && <span className="text-2xl mr-2">{icon}</span>}
              {value}
            </p>
          </div>
          {trend && trendValue && (
            <span className={`text-sm font-semibold ${trendColors[trend]}`}>
              {trend === 'up' && '↑ '}
              {trend === 'down' && '↓ '}
              {trendValue}
            </span>
          )}
        </div>
        {description && (
          <p className="text-sm text-[var(--text-secondary)]">{description}</p>
        )}
      </div>
    </Card>
  )
}

interface AlertCardProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title?: string
  children: React.ReactNode
  onClose?: () => void
}

const alertColors = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    text: 'text-green-700',
    icon: '✓',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-700',
    icon: '✕',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    text: 'text-yellow-700',
    icon: '⚠️',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    text: 'text-blue-700',
    icon: 'ℹ️',
  },
}

export function AlertCard({
  type,
  title,
  children,
  onClose,
}: AlertCardProps) {
  const colors = alertColors[type]

  return (
    <div className={`rounded-lg border p-4 ${colors.bg} ${colors.border} ${colors.text}`}>
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">{colors.icon}</span>
        <div className="flex-1">
          {title && (
            <strong className="block mb-1">
              {title}
            </strong>
          )}
          <div className="text-sm">
            {children}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-lg leading-none opacity-50 hover:opacity-100 transition-opacity"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
