import React from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-[var(--surface)] rounded-2xl ${sizeClasses[size]} w-full max-h-[90vh] overflow-y-auto border border-[var(--border)] shadow-lg`}>
        {/* Header */}
        <div className="sticky top-0 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-[var(--border)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

interface ModalFooterProps {
  onCancel: () => void
  onConfirm?: () => void
  cancelText?: string
  confirmText?: string
  isLoading?: boolean
  isDangerous?: boolean
}

export function ModalFooter({
  onCancel,
  onConfirm,
  cancelText = 'Cancel',
  confirmText = 'Confirm',
  isLoading = false,
  isDangerous = false,
}: ModalFooterProps) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onCancel}
        disabled={isLoading}
        className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--surface-subtle)] transition-colors disabled:opacity-50"
      >
        {cancelText}
      </button>
      {onConfirm && (
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-opacity disabled:opacity-50 text-white ${
            isDangerous
              ? 'bg-red-600 hover:opacity-90'
              : 'bg-[var(--clinical-blue)] hover:opacity-90'
          }`}
        >
          {isLoading ? 'Loading...' : confirmText}
        </button>
      )}
    </div>
  )
}
