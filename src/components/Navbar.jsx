import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from './Logo.jsx'

export default function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  async function handleSignOut() {
    setBusy(true)
    await signOut()
    navigate('/', { replace: true })
  }

  const initial = (user?.email?.[0] ?? '?').toUpperCase()

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo to="/dashboard" />
        <div className="flex items-center gap-3">
          <span
            title={user?.email}
            className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700"
          >
            {initial}
          </span>
          <button onClick={handleSignOut} disabled={busy} className="btn-ghost text-sm">
            Sair
          </button>
        </div>
      </div>
    </header>
  )
}
