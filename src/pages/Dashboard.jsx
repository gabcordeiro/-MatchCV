import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
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
import { STAGES } from '../lib/stages.js'
import StageSelect from '../components/StageSelect.jsx'

const STATUS_LABELS = {
  draft: { label: 'Rascunho', className: 'bg-slate-100 text-slate-600' },
  completed: { label: 'Concluída', className: 'bg-olive-100 text-olive-700' },
  generated: { label: 'Gerada', className: 'bg-brand-100 text-brand-700' },
}

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
  const [toast, setToast] = useState(null) // { message, undo? }
  const toastTimer = useRef(null)

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

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  function switchView(next) {
    setView(next)
    localStorage.setItem('matchcv:view', next)
  }

  function showToast(next) {
    clearTimeout(toastTimer.current)
    setToast(next)
    toastTimer.current = setTimeout(() => setToast(null), 4200)
  }

  async function moveStage(id, stage, { silent = false } = {}) {
    const current = applications.find((a) => a.id === id)
    if (!current || current.stage === stage) return
    const previousStage = current.stage || 'saved'
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
      return
    }
    if (!silent) {
      const stageInfo = STAGES.find((s) => s.id === stage)
      showToast({
        message: `${stageInfo?.emoji ?? ''} Movida para ${stageInfo?.label ?? stage}`,
        undo: () => {
          setToast(null)
          moveStage(id, previousStage, { silent: true })
        },
      })
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
            Arraste pela alça ⠿ para mover entre colunas (ou use o seletor de etapa no card)
          </span>
        )}
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-4">
        {loading ? (
          <KanbanSkeleton />
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
            {applications.map((app, i) => (
              <ApplicationRow key={app.id} app={app} index={i} />
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <div className="animate-toastin fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-lg">
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              onClick={toast.undo}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              Desfazer
            </button>
          )}
        </div>
      )}
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

/* ===== Kanban com drag-and-drop (mouse E toque no celular) =====
   O card arrastado é renderizado num DragOverlay (portal): flutua acima de
   tudo, sem ser cortado pelo overflow das colunas, e tem animação de "queda"
   suave ao soltar. O card original vira um fantasma no lugar. */
function KanbanBoard({ applications, onMove, celebrateId }) {
  const sensors = useSensors(
    // Mouse: começa a arrastar após 6px (cliques continuam funcionando).
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Toque: pequeno atraso antes de arrastar (evita drag acidental num toque).
    // Como o arraste só parte da alça (touch-none), não briga com o scroll.
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  )
  const lastDragAt = useRef(0)
  const [activeId, setActiveId] = useState(null)
  // Colunas recolhidas (Trello-like), lembradas entre sessões.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('matchcv:kanban:collapsed') || '{}')
    } catch {
      return {}
    }
  })
  const activeApp = applications.find((a) => a.id === activeId)

  function toggleCollapse(stageId) {
    setCollapsed((prev) => {
      const next = { ...prev, [stageId]: !prev[stageId] }
      localStorage.setItem('matchcv:kanban:collapsed', JSON.stringify(next))
      return next
    })
  }

  function handleDragStart(event) {
    setActiveId(event.active?.id ?? null)
  }

  function handleDragEnd(event) {
    lastDragAt.current = Date.now()
    setActiveId(null)
    const stage = event.over?.id
    const id = event.active?.id
    if (stage && id) onMove(String(id), String(stage))
  }

  return (
    <DndContext
      sensors={sensors}
      // Auto-scroll horizontal ao arrastar perto da borda (essencial no celular,
      // onde as 5 colunas não cabem na tela e antes era preciso soltar e rolar).
      autoScroll={{ threshold: { x: 0.25, y: 0 }, acceleration: 14 }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      {/* Board: no desktop "quebra" o container central (max-w-5xl) e usa uma
          largura maior — estilo Trello, colunas respiram em vez de espremidas.
          O padding responsivo cria as margens laterais e capa o conteúdo em
          ~1440px centralizado; overflow-x-auto garante scroll se estourar.
          No mobile, segue o scroll horizontal por card (colunas w-64). */}
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:mx-[calc(50%-50vw)] lg:px-[max(1.5rem,calc(50vw-720px))]">
        <div className="flex min-h-[320px] snap-x items-stretch gap-3">
          {STAGES.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              items={applications.filter((a) => (a.stage || 'saved') === stage.id)}
              onMove={onMove}
              celebrateId={celebrateId}
              lastDragAt={lastDragAt}
              dragging={!!activeId}
              collapsed={!!collapsed[stage.id]}
              onToggleCollapse={() => toggleCollapse(stage.id)}
            />
          ))}
        </div>
      </div>

      {/* Portaled ao <body>: o overlay usa position:fixed, e qualquer ancestral
          com transform (como o fade-in de entrada da página) faz esse fixed se
          posicionar relativo AO ancestral, não à tela — era isso que empurrava
          o card fantasma pra longe do cursor (~a distância da margem do layout
          centralizado). No body, nada disso o afeta e ele cola no ponteiro.
          h-full/w-full faz o card preencher a medida real da coluna que o
          dnd-kit calcula. */}
      {createPortal(
        <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }}>
          {activeApp ? (
            <div className="h-full w-full rotate-1 cursor-grabbing rounded-xl border border-brand-400 bg-white p-3 shadow-2xl ring-2 ring-brand-200/60">
              <CardBody app={activeApp} />
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  )
}

function KanbanColumn({ stage, items, onMove, celebrateId, lastDragAt, dragging, collapsed, onToggleCollapse }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })

  // Coluna recolhida: faixa fina vertical. Continua sendo alvo de drop — dá pra
  // soltar um card direto sobre ela sem precisar expandir.
  if (collapsed) {
    return (
      <button
        ref={setNodeRef}
        onClick={onToggleCollapse}
        title={`Expandir ${stage.label}`}
        className={`flex w-11 shrink-0 cursor-pointer flex-col items-center gap-2 rounded-2xl border py-3 transition-all duration-200 ${
          isOver
            ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
            : 'border-slate-200 bg-slate-100/60 hover:bg-slate-100'
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-xs font-medium text-slate-500 shadow-sm">
          {items.length}
        </span>
        <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 [writing-mode:vertical-rl]">
          {stage.label}
        </span>
      </button>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-all duration-200 lg:w-auto lg:flex-1 lg:min-w-0 ${
        isOver
          ? 'border-brand-400 bg-brand-50/80 ring-2 ring-brand-200'
          : dragging
            ? 'border-dashed border-slate-300 bg-slate-100/60'
            : 'border-slate-200 bg-slate-100/60'
      }`}
    >
      {/* faixa de cor da etapa (sensação de funil) */}
      <div className={`h-1 w-full ${stage.tint}`} />

      <div className="flex items-center justify-between gap-1 px-3 pt-3">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
          {stage.label}
        </h3>
        <div className="flex items-center gap-1">
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-white px-1.5 text-xs font-medium text-slate-500 shadow-sm">
            {items.length}
          </span>
          <button
            onClick={onToggleCollapse}
            title={`Recolher ${stage.label}`}
            className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-slate-400 transition-colors hover:bg-white hover:text-brand-600"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* flex-1: a lista (e o placeholder vazio) preenchem a altura da coluna,
          então mesmo colunas vazias viram um alvo de drop alto e fácil de acertar. */}
      <ul className="flex flex-1 flex-col gap-2 p-3">
        {items.length === 0 ? (
          <li
            className={`grid min-h-[80px] flex-1 place-items-center rounded-xl border border-dashed text-center text-[11px] transition-colors ${
              isOver ? 'border-brand-400 bg-brand-50 text-brand-600' : 'border-slate-200 text-slate-400'
            }`}
          >
            {isOver ? '⤵ Solte aqui' : 'arraste vagas para cá'}
          </li>
        ) : (
          items.map((app, i) => (
            <KanbanCard
              key={app.id}
              app={app}
              index={i}
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

function KanbanCard({ app, index, onMove, celebrating, lastDragAt }) {
  const navigate = useNavigate()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
  })

  function handleClick() {
    // Não navega logo após soltar um drag.
    if (Date.now() - lastDragAt.current < 200) return
    navigate(`/dashboard/app/${app.id}`)
  }

  return (
    <li
      ref={setNodeRef}
      onClick={handleClick}
      onContextMenu={(e) => e.preventDefault()}
      style={{ animationDelay: `${Math.min(index, 6) * 40}ms` }}
      className={`animate-cardin relative flex cursor-pointer gap-1.5 select-none rounded-xl border bg-white p-3 shadow-sm transition-all duration-150 [-webkit-touch-callout:none] ${
        isDragging
          ? 'border-dashed border-slate-300 opacity-40'
          : 'border-slate-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md'
      } ${celebrating ? 'animate-pop border-olive-400 ring-2 ring-olive-300' : ''}`}
    >
      {celebrating && <ConfettiBurst />}

      {/* Alça de arraste: só ELA arrasta. `touch-none` (touch-action: none)
          desativa o scroll do navegador apenas aqui, então segurar-e-arrastar
          na alça move o card de verdade no celular, enquanto tocar/rolar no
          resto do card continua funcionando (scroll da lista + abrir a vaga). */}
      <button
        {...listeners}
        {...attributes}
        onClick={(e) => e.stopPropagation()}
        aria-label="Arraste para mover de etapa"
        title="Arraste para mover"
        className="-ml-1 flex w-6 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500 active:cursor-grabbing"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>

      <div className="min-w-0 flex-1">
        <CardBody app={app} celebrating={celebrating} onMove={onMove} />
      </div>
    </li>
  )
}

/* Conteúdo do card, compartilhado entre o card na coluna e o DragOverlay. */
function CardBody({ app, celebrating = false, onMove = null }) {
  const title = app.company_name?.trim() || 'Vaga sem empresa'
  const score = app.match_analysis?.match_score
  const followUp = followUpBadge(app.follow_up_at)
  const isStale =
    !followUp &&
    (app.stage || 'saved') === 'applied' &&
    Date.now() - new Date(app.created_at).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000

  return (
    <>
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
        {onMove ? (
          <StageSelect value={app.stage || 'saved'} onChange={(id) => onMove(app.id, id)} size="sm" />
        ) : (
          <span className="text-[11px] font-medium text-slate-400">
            {STAGES.find((s) => s.id === (app.stage || 'saved'))?.label}
          </span>
        )}
      </div>
    </>
  )
}

/* Confete em CSS puro (12 partículas, sem lib): explode do centro do card. */
const CONFETTI_COLORS = ['#CC6236', '#7C883C', '#E5A585', '#B9C381', '#F0C8B3', '#99A557']

function ConfettiBurst() {
  const pieces = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2
    const dist = 42 + (i % 3) * 18
    return {
      x: `${Math.round(Math.cos(angle) * dist)}px`,
      y: `${Math.round(Math.sin(angle) * dist - 24)}px`,
      r: `${(i % 2 ? 1 : -1) * (180 + i * 30)}deg`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: `${(i % 4) * 40}ms`,
    }
  })
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 overflow-visible">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="animate-confetti absolute left-1/2 top-1/2 block h-2 w-1.5 rounded-[2px]"
          style={{
            backgroundColor: p.color,
            animationDelay: p.delay,
            '--cx': p.x,
            '--cy': p.y,
            '--cr': p.r,
          }}
        />
      ))}
    </span>
  )
}

/* Skeleton do kanban: colunas fantasma em vez de spinner solto — a página
   "chega montada", o que passa muito mais solidez que um spinner no vazio. */
function KanbanSkeleton() {
  return (
    <div className="-mx-4 flex items-start gap-3 overflow-hidden px-4 pb-4 sm:mx-0 sm:px-0">
      {STAGES.map((stage, col) => (
        <div
          key={stage.id}
          className="flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/60 lg:w-auto lg:flex-1"
        >
          <div className={`h-1 w-full ${stage.tint} opacity-40`} />
          <div className="flex items-center justify-between px-3 pt-3">
            <span className="h-3 w-16 animate-pulse rounded bg-slate-200" />
            <span className="h-5 w-5 animate-pulse rounded-full bg-slate-200" />
          </div>
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: col === 0 ? 3 : col % 2 ? 1 : 2 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-2.5 w-full animate-pulse rounded bg-slate-100" />
                <div className="mt-3 h-2 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
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

function ApplicationRow({ app, index = 0 }) {
  const status = STATUS_LABELS[app.status] ?? STATUS_LABELS.draft
  const stageLabel = STAGES.find((s) => s.id === (app.stage || 'saved'))?.label
  const title = app.company_name?.trim() || 'Vaga sem empresa'
  const preview = app.job_description?.slice(0, 140) ?? ''
  const score = app.match_analysis?.match_score

  return (
    <li className="animate-cardin" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <Link
        to={`/dashboard/app/${app.id}`}
        className="card flex items-start justify-between gap-4 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md sm:p-5"
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
