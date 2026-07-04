import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from './AuthContext.jsx'

const ProfileContext = createContext(undefined)

export function ProfileProvider({ children }) {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadProfile = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError(null)

    // Fetch the profile row; create it lazily if it doesn't exist yet.
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id, base_resume, onboarded, avatar_url, plan, role, credits, is_active, generations_used, usage_reset_at, created_at')
      .eq('id', user.id)
      .maybeSingle()

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    if (data) {
      setProfile(data)
      setLoading(false)
      return
    }

    // No row yet — create one for this user.
    const { data: created, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: user.id })
      .select('id, base_resume, onboarded, avatar_url, plan, role, credits, is_active, generations_used, usage_reset_at, created_at')
      .single()

    if (insertError) {
      setError(insertError.message)
    } else {
      setProfile(created)
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const updateProfile = useCallback(
    async (updates) => {
      if (!user) return { error: 'Usuário não autenticado.' }
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('id, base_resume, onboarded, avatar_url, plan, role, credits, is_active, generations_used, usage_reset_at, created_at')
        .single()

      if (updateError) return { error: updateError.message }
      setProfile(data)
      return { data }
    },
    [user],
  )

  return (
    <ProfileContext.Provider value={{ profile, loading, error, reload: loadProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (ctx === undefined) {
    throw new Error('useProfile deve ser usado dentro de <ProfileProvider>')
  }
  return ctx
}
