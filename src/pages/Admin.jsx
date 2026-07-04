import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { adminAction } from '../lib/api.js'
import { useProfile } from '../context/ProfileContext.jsx'
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx'

const PRO_PRICE = 19.9

export default function Admin() {
  const { profile, loading: profileLoading } = useProfile()

  const [users, setUsers] = useState([])
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  async function load() {
    setLoading(true)
    // RLS: as policies de admin permitem ler todas as linhas.
    const [usersRes, appsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, plan, role, is_active, credits, generations_used, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('applications')
        .select('id, user_id, status, created_at')
        .order('created_at', { ascending: false })
        .limit(2000),
    ])
    if (usersRes.error) setError(usersRes.error.message)
    else setUsers(usersRes.data ?? [])
    if (!appsRes.error) setApps(appsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    if (profile?.role === 'admin') load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role])

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search && !(u.email ?? '').toLowerCase().includes(search.toLowerCase())) return false
      if (planFilter !== 'all' && u.plan !== planFilter) return false
      if (statusFilter === 'active' && u.is_active === false) return false
      if (statusFilter === 'disabled' && u.is_active !== false) return false
      return true
    })
  }, [users, search, planFilter, statusFilter])

  if (profileLoading) return <FullPageSpinner />
  if (profile && profile.role !== 'admin') return <Navigate to="/dashboard" replace />

  return (
    <div>
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para o dashboard
      </Link>
      <h1 className="mt-3 text-3xl font-semibold text-slate-900">Admin</h1>
      <p className="mt-1 text-sm text-slate-500">
        Métricas de negócio e gestão de usuários. Acesso garantido por RLS no banco.
      </p>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="grid place-items-center py-16 text-brand-600">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <>
          <Metrics users={users} apps={apps} />

          {/* Análises por dia (engajamento real) */}
          <AnalysesPerDay apps={apps} />

          {/* CRUD de usuários */}
          <div className="card mt-6 p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Usuários ({filtered.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por email"
                  className="input w-48 py-1.5 text-sm"
                />
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className="input w-auto py-1.5 text-sm"
                >
                  <option value="all">Todos os planos</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input w-auto py-1.5 text-sm"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="disabled">Desativados</option>
                </select>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Plano</th>
                    <th className="py-2 pr-3">Créditos</th>
                    <th className="py-2 pr-3">Cadastro</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <UserRow key={u.id} user={u} onChanged={load} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Metrics({ users, apps }) {
  const total = users.length
  const proCount = users.filter((u) => u.plan === 'pro').length
  const mrr = proCount * PRO_PRICE
  const conversion = total > 0 ? Math.round((proCount / total) * 100) : 0
  const completed = apps.filter((a) => a.status === 'completed').length

  const items = [
    ['MRR', `R$ ${mrr.toFixed(2).replace('.', ',')}`, `${proCount} assinantes Pro`],
    ['Conversão free→pago', `${conversion}%`, `${proCount} de ${total} usuários`],
    ['Análises geradas', String(completed), 'total até agora'],
    ['Churn (30d)', '—', 'disponível após ativar o Stripe'],
  ]

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([label, value, sub]) => (
        <div key={label} className="card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-slate-900">{value}</p>
          <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
        </div>
      ))}
    </div>
  )
}

function AnalysesPerDay({ apps }) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    const count = apps.filter((a) => {
      const t = new Date(a.created_at)
      return a.status === 'completed' && t >= d && t < next
    }).length
    days.push({ label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), count })
  }
  const max = Math.max(1, ...days.map((d) => d.count))

  return (
    <div className="card mt-4 p-5 sm:p-6">
      <h2 className="text-sm font-semibold text-slate-700">Análises por dia (últimos 7 dias)</h2>
      <ul className="mt-3 grid gap-1.5">
        {days.map((d) => (
          <li key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-12 shrink-0 text-xs text-slate-400">{d.label}</span>
            <span
              className="h-4 rounded-full bg-brand-200"
              style={{ width: `${(d.count / max) * 70}%`, minWidth: d.count > 0 ? '8px' : '2px' }}
            />
            <span className="font-medium text-slate-700">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function UserRow({ user, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function run(payload) {
    setBusy(true)
    setError(null)
    const { error: err } = await adminAction({ ...payload, user_id: user.id })
    setBusy(false)
    if (err) setError(err)
    else onChanged()
  }

  return (
    <>
      <tr className="border-b border-slate-100">
        <td className="max-w-[220px] truncate py-2.5 pr-3 font-medium text-slate-900">
          {user.email ?? user.id.slice(0, 8)}
          {user.role === 'admin' && (
            <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">
              admin
            </span>
          )}
        </td>
        <td className="py-2.5 pr-3">
          <select
            value={user.plan}
            disabled={busy}
            onChange={(e) => run({ action: 'set_plan', plan: e.target.value })}
            className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </td>
        <td className="py-2.5 pr-3">
          <span className="text-slate-700">{user.credits ?? 0}</span>
          <button
            onClick={() => run({ action: 'add_credits', amount: 10 })}
            disabled={busy}
            title="Adicionar 10 créditos"
            className="ml-2 text-xs font-semibold text-brand-600 hover:text-brand-700"
          >
            +10
          </button>
        </td>
        <td className="py-2.5 pr-3 text-xs text-slate-500">
          {new Date(user.created_at).toLocaleDateString('pt-BR')}
        </td>
        <td className="py-2.5 pr-3">
          {user.is_active === false ? (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
              Desativada
            </span>
          ) : (
            <span className="rounded-full bg-olive-100 px-2 py-0.5 text-xs font-medium text-olive-700">
              Ativa
            </span>
          )}
        </td>
        <td className="py-2.5">
          <button
            onClick={() => run({ action: 'set_active', is_active: user.is_active === false })}
            disabled={busy || user.role === 'admin'}
            className="btn-ghost px-2 py-1 text-xs"
          >
            {busy ? '...' : user.is_active === false ? 'Reativar' : 'Desativar'}
          </button>
        </td>
      </tr>
      {error && (
        <tr>
          <td colSpan={6} className="pb-2 text-xs text-red-600">
            {error}
          </td>
        </tr>
      )}
    </>
  )
}
