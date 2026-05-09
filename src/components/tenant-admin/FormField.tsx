import React from 'react'

interface FormFieldProps {
  label?: string
  error?: string | null
  required?: boolean
  help?: string
  children: React.ReactNode
}

export function FormField({ label, error, required, help, children }: FormFieldProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
      {help && !error && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{help}</p>
      )}
    </div>
  )
}

interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
  help?: string
}

export function TextInput({ label, error, help, ...props }: TextInputProps) {
  return (
    <FormField label={label} error={error} help={help} required={props.required}>
      <input
        {...props}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
      />
    </FormField>
  )
}

interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string | null
  help?: string
  options?: Array<{ value: string; label: string }>
}

export function Select({ label, error, help, options, children, ...props }: SelectProps) {
  return (
    <FormField label={label} error={error} help={help} required={props.required}>
      <select
        {...props}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
      >
        {options ? (
          <>
            <option value="">Select an option</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </>
        ) : (
          children
        )}
      </select>
    </FormField>
  )
}

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string | null
  help?: string
}

export function TextArea({ label, error, help, ...props }: TextAreaProps) {
  return (
    <FormField label={label} error={error} help={help} required={props.required}>
      <textarea
        {...props}
        className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)] resize-none"
      />
    </FormField>
  )
}

interface ColorPickerProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string | null
}

export function ColorPicker({ label, error, ...props }: ColorPickerProps) {
  return (
    <FormField label={label} error={error} required={props.required}>
      <div className="flex gap-2">
        <input
          type="color"
          {...props}
          className="w-12 h-10 rounded-lg border border-[var(--border)] cursor-pointer"
        />
        <input
          type="text"
          value={props.value}
          onChange={props.onChange}
          placeholder="#000000"
          pattern="^#[0-9A-Fa-f]{6}$"
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--page-bg)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--clinical-blue)]"
        />
      </div>
    </FormField>
  )
}

interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  description?: string
}

export function Checkbox({ label, description, ...props }: CheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        {...props}
        className="mt-1 w-4 h-4 rounded border-[var(--border)] cursor-pointer accent-[var(--clinical-blue)]"
      />
      {label && (
        <div>
          <label className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
            {label}
          </label>
          {description && (
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {description}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
