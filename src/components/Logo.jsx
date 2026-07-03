import { Link } from 'react-router-dom'

export default function Logo({ to = '/', className = '' }) {
  const content = (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M6 16V8l3 4.5L12 8v8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M15 11.5l1.8 1.8L20 10"
            stroke="#F0C8B3"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold text-slate-900">
        Match<span className="text-brand-600">CV</span>
      </span>
    </span>
  )

  if (to) {
    return (
      <Link to={to} className="focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 rounded-lg">
        {content}
      </Link>
    )
  }
  return content
}
