import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('[AuthContext] Initializing...')
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      console.log('[AuthContext] Initial session:', u ? u.email : 'null')
      setUser(u)
      setIsAdmin(u ? ADMIN_EMAILS.includes(u.email?.toLowerCase()) : false)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null
        console.log('[AuthContext] Auth State Change:', event, u ? u.email : 'null')
        setUser(u)
        setIsAdmin(u ? ADMIN_EMAILS.includes(u.email?.toLowerCase()) : false)
        setLoading(false) // Ensure loading is false on state change
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    console.log('[AuthContext] Starting Google Sign In...')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}/admin`,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    })
    if (error) {
      console.error('[AuthContext] Google Sign In Error:', error)
      throw error
    }
    console.log('[AuthContext] Google Sign In Data:', data)
    return data
  }

  const signInWithEmail = async (email, password) => {
    console.log('[AuthContext] Starting Email Sign In...')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      console.error('[AuthContext] Email Sign In Error:', error)
      throw error
    }
    console.log('[AuthContext] Email Sign In Success:', data.user?.email)
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin,
      isGamer: !!user && !isAdmin,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
