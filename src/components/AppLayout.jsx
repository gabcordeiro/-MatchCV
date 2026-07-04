import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext.jsx'
import { FullPageSpinner } from './Spinner.jsx'
import Navbar from './Navbar.jsx'

// Layout for the main app (post-onboarding). Redirects users who haven't
// completed onboarding yet, so it only runs once on first access.
export default function AppLayout() {
  const { profile, loading } = useProfile()
  const location = useLocation()

  if (loading) return <FullPageSpinner />

  if (profile && profile.is_active === false) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="card max-w-sm p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Conta desativada</h1>
          <p className="mt-2 text-sm text-slate-500">
            Esta conta foi desativada. Se você acha que foi um engano, fale com o suporte.
          </p>
        </div>
      </div>
    )
  }

  if (profile && !profile.onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      {/* key por rota: cada página entra com um fade sutil */}
      <main
        key={location.pathname}
        className="animate-fadein mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8"
      >
        <Outlet />
      </main>
    </div>
  )
}
