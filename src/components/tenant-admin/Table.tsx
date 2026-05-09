import React from 'react'

interface Column<T> {
  header: string
  accessor: keyof T | ((row: T) => React.ReactNode)
  className?: string
}

interface TableProps<T extends { id: string }> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  error?: string | null
  emptyMessage?: string
  rowClassName?: (row: T) => string
}

export function Table<T extends { id: string }>({
  columns,
  data,
  loading,
  error,
  emptyMessage = 'No data available',
  rowClassName,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-[var(--clinical-blue)] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg border border-red-300 bg-red-50 text-red-700 text-sm">
        {error}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--text-secondary)]">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
      <table className="w-full">
        <thead className="bg-[var(--surface-subtle)] border-b border-[var(--border)]">
          <tr>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {data.map((row) => (
            <tr
              key={row.id}
              className={`hover:bg-[var(--surface-subtle)] transition-colors ${
                rowClassName ? rowClassName(row) : ''
              }`}
            >
              {columns.map((col, idx) => (
                <td
                  key={idx}
                  className={`px-6 py-3 ${col.className || 'text-sm text-[var(--text-primary)]'}`}
                >
                  {typeof col.accessor === 'function'
                    ? col.accessor(row)
                    : (row[col.accessor] as React.ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
