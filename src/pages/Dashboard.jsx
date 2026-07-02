import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../context/ProfileContext.jsx'
import Spinner from '../components/Spinner.jsx'

const STATUS_LABELS = {
  draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-600' },
  generated: { label: 'Gerada', className: 'bg-brand-100 text-brand-700' },
}

export default function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('applications')
        .select('id, company_name, job_description, status, created_at')
        .order('created_at', { ascending: false })

      if (!active) return
      if (err) setError(err.message)
      else setApplications(data ?? [])
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [user])

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas aplicações</h1>
          <p className="mt-1 text-sm text-slate-500">
            Cada candidatura reúne a vaga, sua carta e a análise de compatibilidade.
          </p>
        </div>
        <Link to="/dashboard/new" className="btn-primary shrink-0">
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:inline">Nova aplicação</span>
          <span className="sm:hidden">Nova</span>
        </Link>
      </div>

      {profile && !profile.base_resume && (
        <div className="mt-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Você ainda não adicionou seu currículo base. Ele deixa as análises muito melhores.</span>
          <Link to="/onboarding" className="font-semibold underline underline-offset-2">
            Adicionar currículo
          </Link>
        </div>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="grid place-items-center py-16 text-brand-600">
            <Spinner className="h-7 w-7" />
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : applications.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="grid gap-3">
            {applications.map((app) => (
              <ApplicationRow key={app.id} app={app} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function ApplicationRow({ app }) {
  const status = STATUS_LABELS[app.status] ?? STATUS_LABELS.draft
  const title = app.company_name?.trim() || 'Vaga sem empresa'
  const preview = app.job_description?.slice(0, 140) ?? ''

  return (
    <li className="card flex items-start justify-between gap-4 p-4 sm:p-5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-slate-900">{title}</h3>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">{preview}</p>
        <p className="mt-2 text-xs text-slate-400">{formatDate(app.created_at)}</p>
      </div>
    </li>
  )
}

function EmptyState() {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden="true">
          <path
            d="M4 5h16v11a2 2 0 01-2 2H8l-4 3V5z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">Nenhuma aplicação ainda</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Crie sua primeira aplicação colando a descrição de uma vaga. Guardamos tudo aqui para você.
      </p>
      <Link to="/dashboard/new" className="btn-primary mt-6">
        + Nova aplicação
      </Link>
    </div>
  )
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return ''
  }
}
