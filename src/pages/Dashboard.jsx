import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../context/ProfileContext.jsx'
import Spinner from '../components/Spinner.jsx'

const STATUS_LABELS = {
  draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-600' },
  completed: { label: 'Concluída', className: 'bg-olive-100 text-olive-700' },
  generated: { label: 'Gerada', className: 'bg-brand-100 text-brand-700' },
}

export const STAGES = [
  { id: 'saved', label: 'Salvas', emoji: '📌', dot: 'bg-slate-400', tint: 'bg-slate-400' },
  { id: 'applied', label: 'Aplicadas', emoji: '📨', dot: 'bg-brand-500', tint: 'bg-brand-500' },
  { id: 'interview', label: 'Entrevista', emoji: '🎯', dot: 'bg-amber-500', tint: 'bg-amber-500' },
  { id: 'offer', label: 'Oferta', emoji: '🏆', dot: 'bg-olive-500', tint: 'bg-olive-500' },
  { id: 'rejected', label: 'Recusadas', emoji: '✕', dot: 'bg-slate-300', tint: 'bg-slate-300' },
]

const FREE_LIMIT = 3
const STALE_DAYS = 30

export default function Dashboard() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState(() => localStorage.getItem('matchcv:view') || 'kanban')
  const [celebrateId, setCelebrateId] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('applications')
        .select('id, company_name, job_description, job_url, status, stage, match_analysis, follow_up_at, created_at')
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
    const current = applications.find((a) => a.id === id)
    if (!current || current.stage === stage) return
    const prev = applications
    setApplications((apps) => apps.map((a) => (a.id === id ? { ...a, stage } : a)))
    if (stage === 'offer') {
      setCelebrateId(id)
      setTimeout(() => setCelebrateId(null), 1400)
    }
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
          <h1 className="text-2xl font-semibold text-slate-900">Minhas aplicações</h1>
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
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-0.5">
          <ViewButton active={view === 'kanban'} onClick={() => switchView('kanban')}>
            Kanban
          </ViewButton>
          <ViewButton active={view === 'list'} onClick={() => switchView('list')}>
            Lista
          </ViewButton>
        </div>
        {view === 'kanban' && (
          <span className="hidden text-xs text-slate-400 sm:inline">
            Arraste os cards entre as colunas (funciona no celular: segure e arraste)
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="grid place-items-center py-16 text-brand-600">
            <Spinner className="h-7 w-7" />
          </div>
        ) : applications.length === 0 ? (
          <EmptyState />
        ) : view === 'kanban' ? (
          <KanbanBoard
            applications={applications}
            onMove={moveStage}
            celebrateId={celebrateId}
          />
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
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
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
  const credits = profile.credits ?? 0

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Plano Free — <span className="font-semibold text-slate-900">{used} de {FREE_LIMIT}</span>{' '}
        gerações usadas este mês
        {credits > 0 && (
          <>
            {' '}· <span className="font-semibold text-slate-900">{credits}</span> créditos avulsos
          </>
        )}
      </span>
      <Link to="/dashboard/upgrade" className="font-semibold text-brand-600 hover:text-brand-700">
        Fazer upgrade →
      </Link>
    </div>
  )
}

/* ===== Kanban com drag-and-drop (mouse E toque no celular) ===== */
function KanbanBoard({ applications, onMove, celebrateId }) {
  const sensors = useSensors(
    // Mouse: começa a arrastar após 6px (cliques continuam funcionando).
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Toque: segura ~180ms para arrastar (o scroll da página continua livre).
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )
  const lastDragAt = useRef(0)

  function handleDragEnd(event) {
    lastDragAt.current = Date.now()
    const stage = event.over?.id
    const id = event.active?.id
    if (stage && id) onMove(String(id), String(stage))
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="-mx-4 flex snap-x items-start gap-3 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:overflow-x-visible">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            items={applications.filter((a) => (a.stage || 'saved') === stage.id)}
            onMove={onMove}
            celebrateId={celebrateId}
            lastDragAt={lastDragAt}
          />
        ))}
      </div>
    </DndContext>
  )
}

function KanbanColumn({ stage, items, onMove, celebrateId, lastDragAt }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-colors lg:w-auto lg:flex-1 lg:min-w-0 ${
        isOver
          ? 'border-brand-400 bg-brand-50/80 ring-2 ring-brand-200'
          : 'border-slate-200 bg-slate-100/60'
      }`}
    >
      {/* faixa de cor da etapa (sensação de funil) */}
      <div className={`h-1 w-full ${stage.tint}`} />

      <div className="flex items-center justify-between px-3 pt-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
          {stage.label}
        </h3>
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-xs font-medium text-slate-500 shadow-sm">
          {items.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2 p-3">
        {items.length === 0 ? (
          <li
            className={`grid min-h-[64px] place-items-center rounded-xl border border-dashed text-center text-[11px] transition-colors ${
              isOver ? 'border-brand-400 text-brand-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            {isOver ? 'Solte aqui' : 'arraste vagas para cá'}
          </li>
        ) : (
          items.map((app) => (
            <KanbanCard
              key={app.id}
              app={app}
              onMove={onMove}
              celebrating={celebrateId === app.id}
              lastDragAt={lastDragAt}
            />
          ))
        )}
      </ul>
    </div>
  )
}

function KanbanCard({ app, onMove, celebrating, lastDragAt }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: app.id,
  })

  const title = app.company_name?.trim() || 'Vaga sem empresa'
  const score = app.match_analysis?.match_score
  const followUp = followUpBadge(app.follow_up_at)
  const isStale =
    !followUp &&
    (app.stage || 'saved') === 'applied' &&
    Date.now() - new Date(app.created_at).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  function handleClick() {
    // Não navega logo após soltar um drag.
    if (Date.now() - lastDragAt.current < 200) return
    navigate(`/dashboard/app/${app.id}`)
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleClick}
      className={`cursor-grab touch-manipulation rounded-xl border bg-white p-3 shadow-sm transition-[box-shadow,border-color] ${
        isDragging
          ? 'z-50 rotate-2 scale-105 cursor-grabbing border-brand-400 shadow-xl'
          : 'border-slate-200 hover:border-brand-300'
      } ${celebrating ? 'animate-pop border-olive-400 ring-2 ring-olive-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="truncate text-sm font-semibold text-slate-900">
          {celebrating && '🎉 '}
          {title}
        </h4>
        {typeof score === 'number' && (
          <span
            title="Compatibilidade com a vaga"
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs font-bold ${scoreChip(score)}`}
          >
            {score}%
          </span>
        )}
      </div>
      {app.job_description?.trim() && (
        <p className="mt-1 line-clamp-1 text-xs text-slate-500">{app.job_description.trim()}</p>
      )}
      {followUp && (
        <p
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${followUp.className}`}
        >
          ⏰ {followUp.label}
        </p>
      )}
      {isStale && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
          ⏳ {STALE_DAYS}+ dias sem resposta
        </p>
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <span className="flex items-center gap-2 text-[11px] text-slate-400">
          {formatDate(app.created_at)}
          {app.job_url && (
            <a
              href={app.job_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              title="Abrir a vaga"
              className="text-brand-600 hover:text-brand-700"
            >
              🔗
            </a>
          )}
        </span>
        <select
          value={app.stage || 'saved'}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onChange={(e) => onMove(app.id, e.target.value)}
          title="Mover para outra etapa"
          className="cursor-pointer rounded-md border-0 bg-transparent py-0.5 pl-1 pr-4 text-[11px] font-medium text-slate-500 hover:text-brand-600 focus:ring-1 focus:ring-brand-300"
        >
          {STAGES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.emoji} {s.label}
            </option>
          ))}
        </select>
      </div>
    </li>
  )
}

// Chip de score: verde alto, âmbar médio, terracota baixo (leitura rápida).
function scoreChip(score) {
  if (score >= 75) return 'bg-olive-100 text-olive-700'
  if (score >= 50) return 'bg-amber-100 text-amber-700'
  return 'bg-brand-100 text-brand-700'
}

// Badge de follow-up: atrasado (vermelho), hoje/logo (âmbar), futuro (neutro).
function followUpBadge(followUpAt) {
  if (!followUpAt) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(followUpAt)
  target.setHours(0, 0, 0, 0)
  const days = Math.round((target - today) / (24 * 60 * 60 * 1000))

  if (days < 0) return { label: 'retorno atrasado', className: 'bg-red-50 text-red-700' }
  if (days === 0) return { label: 'dar retorno hoje', className: 'bg-amber-100 text-amber-800' }
  if (days === 1) return { label: 'retorno amanhã', className: 'bg-amber-50 text-amber-700' }
  if (days <= 3) return { label: `retorno em ${days} dias`, className: 'bg-amber-50 text-amber-700' }
  return { label: `retorno em ${days} dias`, className: 'bg-slate-100 text-slate-500' }
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
