import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface InitialPasswordRecoveryCallback {
  isPasswordRecovery: boolean
  errorCode: string | null
}

function readInitialPasswordRecoveryCallback(): InitialPasswordRecoveryCallback {
  if (typeof window === 'undefined') {
    return { isPasswordRecovery: false, errorCode: null }
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)
  const type = hash.get('type') ?? search.get('type')
  const errorCode = hash.get('error_code') ?? search.get('error_code')
  const isResetPath = window.location.pathname === '/reset-password'
  const hasSessionToken = hash.has('access_token') || search.has('code')

  return {
    isPasswordRecovery: type === 'recovery' || (isResetPath && (hasSessionToken || !!errorCode)),
    errorCode,
  }
}

let initialPasswordRecoveryCallback = readInitialPasswordRecoveryCallback()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in your project values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function consumeInitialPasswordRecoveryCallback() {
  const value = initialPasswordRecoveryCallback
  initialPasswordRecoveryCallback = { isPasswordRecovery: false, errorCode: null }
  return value
}
