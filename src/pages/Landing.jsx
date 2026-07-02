import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from '../components/Logo.jsx'

const features = [
  {
    title: 'Cartas de apresentação personalizadas',
    description:
      'Gere uma carta sob medida para cada vaga, com o tom certo e destacando o que importa para a empresa.',
    icon: (
      <path
        d="M4 5h16v11a2 2 0 01-2 2H8l-4 3V5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: 'Análise de compatibilidade do currículo',
    description:
      'Descubra o quanto seu currículo combina com a vaga e quais palavras-chave estão faltando.',
    icon: (
      <>
        <path
          d="M4 19V5m0 14h16"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 15l3-4 3 2 4-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    title: 'Tudo organizado em um só lugar',
    description:
      'Guarde suas candidaturas, vagas e cartas geradas para reaproveitar e acompanhar cada processo.',
    icon: (
      <>
        <rect
          x="4"
          y="4"
          width="16"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </>
    ),
  },
]

export default function Landing() {
  const { session } = useAuth()
  const primaryTo = session ? '/dashboard' : '/auth'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo to="/" />
        <Link to={primaryTo} className="btn-ghost text-sm">
          {session ? 'Ir para o app' : 'Entrar'}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        {/* Hero */}
        <section className="py-16 text-center sm:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            Sua candidatura turbinada por IA
          </span>
          <h1 className="mx-auto mt-6 max-w-2xl text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Candidate-se com{' '}
            <span className="text-brand-600">mais confiança</span> a cada vaga
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            O MatchCV cria cartas de apresentação personalizadas e mostra o quanto seu currículo
            combina com cada vaga — em minutos.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to={primaryTo} className="btn-primary w-full px-6 py-3 text-base sm:w-auto">
              Começar grátis
            </Link>
            <a href="#como-funciona" className="btn-secondary w-full px-6 py-3 text-base sm:w-auto">
              Como funciona
            </a>
          </div>
        </section>

        {/* Features */}
        <section id="como-funciona" className="pb-20">
          <div className="grid gap-5 sm:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card p-6 text-left">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
                    {f.icon}
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo to="/" />
          <span>© {new Date().getFullYear()} MatchCV. Feito para candidatos.</span>
        </div>
      </footer>
    </div>
  )
}
