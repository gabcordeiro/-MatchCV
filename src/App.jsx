import { Navigate, Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth.jsx'
import AppLayout from './components/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import Terms from './pages/Terms.jsx'
import Privacy from './pages/Privacy.jsx'
import Contact from './pages/Contact.jsx'
import Onboarding from './pages/Onboarding.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NewApplication from './pages/NewApplication.jsx'
import ApplicationDetail from './pages/ApplicationDetail.jsx'
import Upgrade from './pages/Upgrade.jsx'
import Profile from './pages/Profile.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/termos" element={<Terms />} />
      <Route path="/privacidade" element={<Privacy />} />
      <Route path="/contato" element={<Contact />} />

      {/* Authenticated */}
      <Route element={<RequireAuth />}>
        {/* Onboarding lives outside AppLayout so it can render without the navbar */}
        <Route path="/onboarding" element={<Onboarding />} />

        {/* Main app (redirects to onboarding until it's completed) */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/new" element={<NewApplication />} />
          <Route path="/dashboard/app/:id" element={<ApplicationDetail />} />
          <Route path="/dashboard/upgrade" element={<Upgrade />} />
          <Route path="/dashboard/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
