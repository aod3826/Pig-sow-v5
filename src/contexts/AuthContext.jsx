import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session,  setSession]  = useState(undefined) // undefined = loading
  const [worker,   setWorker]   = useState(null)
  const [farmId,   setFarmId]   = useState(null)

  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) fetchWorker(data.session.user.id)
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setSession(session)
      if (session) fetchWorker(session.user.id)
      else { setWorker(null); setFarmId(null) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchWorker(userId) {
    const { data } = await supabase
      .from('workers')
      .select('*, farms(name, owner_name)')
      .eq('id', userId)
      .single()
    if (data) {
      setWorker(data)
      setFarmId(data.farm_id)
    }
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, worker, farmId, signIn, signOut, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
