import { Link } from 'react-router-dom'
import { SITE } from '../lib/site.js'

// Rodapé compartilhado: identidade + links legais/contato. Presente na landing,
// nas páginas públicas e no app logado — sinal básico de negócio confiável.
export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="flex flex-col gap-1">
          <span className="font-display text-base font-semibold text-slate-700">{SITE.name}</span>
          <span className="max-w-xs">
            Feito no Brasil, para quem cansou de mandar currículo no vazio.
          </span>
          <span className="mt-1 text-xs text-slate-400">
            © {year} {SITE.name} · {SITE.cityState}
          </span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/termos" className="hover:text-slate-700">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="hover:text-slate-700">
            Privacidade
          </Link>
          <Link to="/contato" className="hover:text-slate-700">
            Contato
          </Link>
        </nav>
      </div>
    </footer>
  )
}
