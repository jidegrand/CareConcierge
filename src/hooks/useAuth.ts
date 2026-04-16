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
    if (!nextProfile.active) {
      await handleInactiveProfile()
      return false
    }

    setProfile(nextProfile)
    return true
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
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
