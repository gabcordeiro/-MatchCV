import { Link } from 'react-router-dom'

/*
 * Marca do MatchCV: um palito de fósforo aceso.
 * O trocadilho é a marca — "Match" (fósforo, em inglês) + "dar match com a vaga".
 * A chama treme no hover (animate-flicker). Formato de app icon (badge
 * arredondado) para funcionar em avatar de rede social, favicon e compartilhamento.
 */
export function LogoMark({ className = 'h-8 w-8' }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#B84E24" />
      {/* palito */}
      <rect x="14.7" y="15.5" width="2.6" height="10.5" rx="1.3" fill="#FFFFFF" />
      {/* chama (treme no hover via .group) */}
      <g className="transition-transform group-hover:animate-flicker">
        <path
          d="M16 4.6C13.1 8.1 11.4 10.7 11.4 13.1a4.6 4.6 0 0 0 9.2 0C20.6 10.7 18.9 8.1 16 4.6Z"
          fill="#F6B75B"
        />
        <path
          d="M16 9.1c-1.5 1.9-2.3 3.2-2.3 4.4a2.3 2.3 0 0 0 4.6 0c0-1.2-.8-2.5-2.3-4.4Z"
          fill="#FDEBD7"
        />
      </g>
    </svg>
  )
}

export default function Logo({ to = '/', className = '' }) {
  const content = (
    <span
      className={`group inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}
    >
      <LogoMark />
      <span className="font-display text-lg font-semibold text-slate-900">
        Match<span className="text-brand-600">CV</span>
      </span>
    </span>
  )

  if (to) {
    return (
      <Link
        to={to}
        className="rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        {content}
      </Link>
    )
  }
  return content
}
