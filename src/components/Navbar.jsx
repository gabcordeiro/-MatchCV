import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../context/ProfileContext.jsx'
import Logo from './Logo.jsx'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    await signOut()
    navigate('/', { replace: true })
  }

  const initial = (user?.email?.[0] ?? '?').toUpperCase()
  const avatarUrl = profile?.avatar_url

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-3">
          <Link to="/dashboard/profile" title="Meu perfil e currículos">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Foto de perfil"
                className="h-8 w-8 rounded-full object-cover ring-1 ring-slate-200 transition hover:ring-brand-400"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 transition hover:ring-2 hover:ring-brand-400">
                {initial}
              </span>
            )}
          </Link>
          <button onClick={handleSignOut} disabled={busy} className="btn-ghost text-sm">
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
