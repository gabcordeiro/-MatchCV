import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext.jsx'
import { createCheckout } from '../lib/api.js'
import Spinner from '../components/Spinner.jsx'

const FEATURES_FREE = [
  '3 análises por mês',
  'Kanban de candidaturas ilimitado',
  'Carta de apresentação + match score',
]

const FEATURES_PRO = [
  'Análises ilimitadas',
  'Perguntas prováveis da entrevista (exclusivo)',
  'Tudo do plano Free',
  'Prioridade em novos recursos',
]

const FEATURES_CREDITS = [
  '10 análises para usar quando quiser',
  'Pagamento único — Pix ou cartão',
  'Sem assinatura, sem renovação',
]

export default function Upgrade() {
  const { profile } = useProfile()
  const [busy, setBusy] = useState('') // '' | 'pro' | 'credits'
  const [notice, setNotice] = useState(null)

  const isPro = profile?.plan === 'pro'

  async function handleBuy(product) {
    setNotice(null)
    setBusy(product)
    const { data, error } = await createCheckout(product)
    setBusy('')
    if (data?.url) {
      window.location.href = data.url
      return
    }
    setNotice(error || 'Pagamentos ainda não estão ativados. Em breve!')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para o dashboard
      </Link>

      <h1 className="mt-3 text-3xl font-semibold text-slate-900">Planos</h1>
      <p className="mt-1 text-sm text-slate-500">
        Comece grátis. Assine quando estiver aplicando de verdade — ou compre créditos
        avulsos no Pix, sem assinatura.
      </p>

      {isPro && (
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          ⚡ Você já é assinante Pro — análises ilimitadas. Obrigado!
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <PlanCard
          name="Free"
          price="R$ 0"
          period="/mês"
          features={FEATURES_FREE}
          footer={
            <span className="text-center text-xs text-slate-400">
              {isPro ? 'Plano básico' : 'Seu plano atual'}
            </span>
          }
        />
        <PlanCard
          name="Pro"
          price="R$ 19,90"
          period="/mês"
          features={FEATURES_PRO}
          highlight
          footer={
            isPro ? (
              <span className="text-center text-xs font-medium text-brand-700">Plano atual ⚡</span>
            ) : (
              <button
                onClick={() => handleBuy('pro')}
                disabled={!!busy}
                className="btn-primary w-full"
              >
                {busy === 'pro' ? <Spinner label="Abrindo..." /> : 'Assinar Pro'}
              </button>
            )
          }
        />
        <PlanCard
          name="Pacote de créditos"
          price="R$ 9,90"
          period=" · 10 análises"
          features={FEATURES_CREDITS}
          footer={
            <button
              onClick={() => handleBuy('credits')}
              disabled={!!busy}
              className="btn-secondary w-full"
            >
              {busy === 'credits' ? <Spinner label="Abrindo..." /> : 'Comprar no Pix'}
            </button>
          }
        />
      </div>

      {notice && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Pagamento processado com segurança pelo Stripe. Assinatura cancela quando quiser.
      </p>
    </div>
  )
}

function PlanCard({ name, price, period, features, highlight, footer }) {
  return (
    <div
      className={`card flex flex-col gap-4 p-6 ${
        highlight ? 'border-brand-300 ring-1 ring-brand-200' : ''
      }`}
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
        <p className="mt-1">
          <span className="font-display text-3xl font-semibold text-slate-900">{price}</span>
          <span className="text-sm text-slate-400">{period}</span>
        </p>
      </div>
      <ul className="grid flex-1 gap-2 text-sm text-slate-600">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 text-brand-600">✓</span>
            {f}
          </li>
        ))}
      </ul>
      {footer}
    </div>
  )
}
