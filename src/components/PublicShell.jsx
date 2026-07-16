import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from './Logo.jsx'
import Footer from './Footer.jsx'

// Moldura das páginas públicas (Termos, Privacidade, Contato): cabeçalho com
// logo, conteúdo centralado e o rodapé compartilhado. Acessível sem login.
export default function PublicShell({ children, width = 'max-w-3xl' }) {
  const { session } = useAuth()
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo to="/" />
          <Link to={session ? '/dashboard' : '/auth'} className="btn-ghost text-sm">
            {session ? 'Ir para o app' : 'Entrar'}
          </Link>
        </div>
      </header>
      <main className={`mx-auto w-full flex-1 px-4 py-10 sm:px-6 ${width}`}>{children}</main>
      <Footer />
    </div>
  )
}
