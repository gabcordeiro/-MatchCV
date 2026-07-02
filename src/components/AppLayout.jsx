import { Navigate, Outlet } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext.jsx'
import { FullPageSpinner } from './Spinner.jsx'
import Navbar from './Navbar.jsx'

// Layout for the main app (post-onboarding). Redirects users who haven't
// completed onboarding yet, so it only runs once on first access.
export default function AppLayout() {
  const { profile, loading } = useProfile()

  if (loading) return <FullPageSpinner />

  if (profile && !profile.onboarded) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
