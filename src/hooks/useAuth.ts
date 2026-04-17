import { useEffect, useState, createContext, useContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

const INACTIVE_ACCOUNT_NOTICE_KEY = 'bayrequest_inactive_account_notice'

// ── Context ───────────────────────────────────────────────────────────────────
interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)

// ── Provider ──────────────────────────────────────────────────────────────────
export function useAuthProvider(): AuthContextValue {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const handleInactiveProfile = async () => {
    try {
      localStorage.setItem(INACTIVE_ACCOUNT_NOTICE_KEY, '1')
    } catch {}
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        setProfile(null)
        return false
      }

      const nextProfile = data as UserProfile
      if (nextProfile.active === false) {
        await handleInactiveProfile()
        return false
      }

      setProfile(nextProfile)
      return true
    } catch {
      setProfile(null)
      return false
    }
  }

  useEffect(() => {
    let cancelled = false

    const syncSession = async (nextSession: Session | null) => {
      if (cancelled) return

      setSession(nextSession)

      try {
        if (nextSession?.user) {
          await fetchProfile(nextSession.user.id)
        } else {
          setProfile(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => syncSession(session))
      .catch(() => {
        if (cancelled) return
        setSession(null)
        setProfile(null)
        setLoading(false)
      })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        // Supabase warns that awaiting other client calls inside this callback can deadlock.
        window.setTimeout(() => {
          void syncSession(nextSession)
        }, 0)
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session?.user) return

    const interval = window.setInterval(() => {
      fetchProfile(session.user.id)
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [session?.user?.id])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
  }
}
