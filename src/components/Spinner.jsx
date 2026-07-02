export default function Spinner({ className = 'h-5 w-5', label }) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <svg
        className={`animate-spin text-current ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
        />
      </svg>
      {label && <span>{label}</span>}
    </span>
  )
}

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 text-brand-600">
      <Spinner className="h-8 w-8" />
    </div>
  )
}
