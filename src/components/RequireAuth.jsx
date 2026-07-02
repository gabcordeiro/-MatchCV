import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { ProfileProvider } from '../context/ProfileContext.jsx'
import { FullPageSpinner } from './Spinner.jsx'

// Gate for authenticated routes. Also mounts the ProfileProvider so every
// nested route shares a single profile fetch.
export default function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />

  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />
  }

  return (
    <ProfileProvider>
      <Outlet />
    </ProfileProvider>
  )
}
