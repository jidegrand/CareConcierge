// ── Shared utility types & functions ──────────────────────────────────────────
// Single source of truth for patterns that recur across hooks and lib files.

export type MaybeArray<T> = T | T[] | null | undefined

/**
 * Supabase relational queries may return a single object or a one-element array
 * depending on the query configuration. This unwraps both cases safely.
 */
export function getSingle<T>(value: MaybeArray<T>): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

/**
 * Converts a human-readable string to a URL-safe slug.
 */
export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
