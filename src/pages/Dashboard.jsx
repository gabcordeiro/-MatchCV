import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../context/ProfileContext.jsx'
import Spinner from '../components/Spinner.jsx'

const STATUS_LABELS = {
  draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-600' },
  completed: { label: 'Concluída', className: 'bg-emerald-100 text-emerald-700' },
  generated: { label: 'Gerada', className: 'bg-brand-100 text-brand-700' },
}

export const STAGES = [
  { id: 'saved', label: 'Salvas' },
  { id: 'applied', label: 'Aplicadas' },
  { id: 'interview', label: 'Entrevista' },
  { id: 'offer', label: 'Oferta' },
  { id: 'rejected', label: 'Recusadas' },
]

const FREE_LIMIT = 3

export default function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState(() => localStorage.getItem('matchcv:view') || 'kanban')

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('applications')
        .select('id, company_name, job_description, status, stage, match_analysis, created_at')
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

  function switchView(next) {
    setView(next)
    localStorage.setItem('matchcv:view', next)
  }

  async function moveStage(id, stage) {
    const prev = applications
    setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, stage } : a)))
    const { error: err } = await supabase.from('applications').update({ stage }).eq('id', id)
    if (err) {
      setApplications(prev)
      setError(err.message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minhas aplicações</h1>
          <p className="mt-1 text-sm text-slate-500">
            Acompanhe cada candidatura, da vaga salva até a oferta.
          </p>
        </div>
        <Link to="/dashboard/new" className="btn-primary shrink-0">
          <span className="text-lg leading-none">+</span>
          <span className="hidden sm:inline">Nova aplicação</span>
          <span className="sm:hidden">Nova</span>
        </Link>
      </div>

      <UsageBanner profile={profile} />

      {profile && !profile.base_resume && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Você ainda não adicionou seu currículo. Ele deixa as análises muito melhores.</span>
          <Link to="/dashboard/profile" className="font-semibold underline underline-offset-2">
            Adicionar currículo
          </Link>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          <ViewButton active={view === 'kanban'} onClick={() => switchView('kanban')}>
            Kanban
          </ViewButton>
          <ViewButton active={view === 'list'} onClick={() => switchView('list')}>
            Lista
          </ViewButton>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="grid place-items-center py-16 text-brand-600">
            <Spinner className="h-7 w-7" />
          </div>
        ) : applications.length === 0 ? (
          <EmptyState />
        ) : view === 'kanban' ? (
          <KanbanBoard applications={applications} onMove={moveStage} />
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

function ViewButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  )
}

function UsageBanner({ profile }) {
  if (!profile) return null

  if (profile.plan === 'pro') {
    return (
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
        ⚡ Plano Pro — gerações ilimitadas
      </p>
    )
  }

  const resetPassed = profile.usage_reset_at && new Date(profile.usage_reset_at) <= new Date()
  const used = resetPassed ? 0 : (profile.generations_used ?? 0)

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Plano Free — <span className="font-semibold text-slate-900">{used} de {FREE_LIMIT}</span>{' '}
        gerações usadas este mês
      </span>
      <Link to="/dashboard/upgrade" className="font-semibold text-brand-600 hover:text-brand-700">
        Fazer upgrade →
      </Link>
    </div>
  )
}

function KanbanBoard({ applications, onMove }) {
  return (
    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
      {STAGES.map((stage) => {
        const items = applications.filter((a) => (a.stage || 'saved') === stage.id)
        return (
          <div
            key={stage.id}
            className="w-64 shrink-0 snap-start rounded-2xl border border-slate-200 bg-slate-100/70 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const id = e.dataTransfer.getData('text/plain')
              if (id) onMove(id, stage.id)
            }}
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {stage.label}
              </h3>
              <span className="text-xs text-slate-400">{items.length}</span>
            </div>
            <ul className="mt-2 grid min-h-[48px] gap-2">
              {items.map((app) => (
                <KanbanCard key={app.id} app={app} onMove={onMove} />
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function KanbanCard({ app, onMove }) {
  const navigate = useNavigate()
  const title = app.company_name?.trim() || 'Vaga sem empresa'
  const score = app.match_analysis?.match_score

  return (
    <li
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', app.id)}
      onClick={() => navigate(`/dashboard/app/${app.id}`)}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="truncate text-sm font-semibold text-slate-900">{title}</h4>
        {typeof score === 'number' && (
          <span className="shrink-0 text-sm font-bold text-brand-600">{score}%</span>
        )}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
        {app.job_description?.slice(0, 90)}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{formatDate(app.created_at)}</span>
        <select
          value={app.stage || 'saved'}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onMove(app.id, e.target.value)}
          className="rounded-md border border-slate-200 bg-white px-1 py-0.5 text-[11px] text-slate-600"
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </li>
  )
}

function ApplicationRow({ app }) {
  const status = STATUS_LABELS[app.status] ?? STATUS_LABELS.draft
  const stageLabel = STAGES.find((s) => s.id === (app.stage || 'saved'))?.label
  const title = app.company_name?.trim() || 'Vaga sem empresa'
  const preview = app.job_description?.slice(0, 140) ?? ''
  const score = app.match_analysis?.match_score

  return (
    <li>
      <Link
        to={`/dashboard/app/${app.id}`}
        className="card flex items-start justify-between gap-4 p-4 transition-colors hover:border-brand-300 sm:p-5"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">{title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            {stageLabel && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                {stageLabel}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{preview}</p>
          <p className="mt-2 text-xs text-slate-400">{formatDate(app.created_at)}</p>
        </div>
        {typeof score === 'number' && (
          <div className="shrink-0 text-right">
            <div className="text-lg font-bold text-brand-600">{score}%</div>
            <div className="text-[11px] text-slate-400">match</div>
          </div>
        )}
      </Link>
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
