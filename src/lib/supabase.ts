import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

interface InitialAuthCallback {
  isPasswordRecovery: boolean
  isInvite: boolean
  errorCode: string | null
  errorDescription: string | null
}

interface InitialPasswordRecoveryCallback {
  isPasswordRecovery: boolean
  errorCode: string | null
}

interface InitialInviteCallback {
  isInvite: boolean
  errorCode: string | null
  errorDescription: string | null
}

function readInitialAuthCallback(): InitialAuthCallback {
  if (typeof window === 'undefined') {
    return { isPasswordRecovery: false, isInvite: false, errorCode: null, errorDescription: null }
  }

  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const search = new URLSearchParams(window.location.search)
  const type = hash.get('type') ?? search.get('type')
  const errorCode = hash.get('error_code') ?? search.get('error_code')
  const errorDescription = hash.get('error_description') ?? search.get('error_description')
  const isResetPath = window.location.pathname === '/reset-password'
  const isSetPasswordPath = window.location.pathname === '/set-password'
  const hasSessionToken = hash.has('access_token') || search.has('code')
  const hasAuthError = !!errorCode

  return {
    isPasswordRecovery: type === 'recovery' || (isResetPath && (hasSessionToken || hasAuthError)),
    isInvite: type === 'invite' || (isSetPasswordPath && (hasSessionToken || hasAuthError)),
    errorCode,
    errorDescription,
  }
}

let initialAuthCallback = readInitialAuthCallback()

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in your project values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export function consumeInitialPasswordRecoveryCallback() {
  const value: InitialPasswordRecoveryCallback = {
    isPasswordRecovery: initialAuthCallback.isPasswordRecovery,
    errorCode: initialAuthCallback.errorCode,
  }
  initialAuthCallback = { ...initialAuthCallback, isPasswordRecovery: false }
  return value
}

export function consumeInitialInviteCallback() {
  const value: InitialInviteCallback = {
    isInvite: initialAuthCallback.isInvite,
    errorCode: initialAuthCallback.errorCode,
    errorDescription: initialAuthCallback.errorDescription,
  }
  initialAuthCallback = { ...initialAuthCallback, isInvite: false }
  return value
}

export function peekInitialAuthCallback() {
  const value: InitialAuthCallback = { ...initialAuthCallback }
  return value
}
