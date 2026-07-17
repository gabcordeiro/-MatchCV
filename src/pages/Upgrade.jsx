import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
  'Otimização do perfil do LinkedIn (exclusivo)',
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [busy, setBusy] = useState('') // '' | 'pro' | 'credits'
  const [notice, setNotice] = useState(null)
  const [cancelled, setCancelled] = useState(false)

  const isPro = profile?.plan === 'pro'
  const credits = profile?.credits ?? 0

  // Volta do Mercado Pago sem concluir (?checkout=cancelled).
  useEffect(() => {
    if (searchParams.get('checkout') !== 'cancelled') return
    setCancelled(true)
    const next = new URLSearchParams(searchParams)
    next.delete('checkout')
    setSearchParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

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

      <div className="mt-3 text-center sm:text-left">
        <h1 className="text-3xl font-semibold text-slate-900">
          Pare de mandar currículo no escuro.
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 sm:mx-0">
          Ferramentas gringas equivalentes custam de <s>R$ 105</s> a <s>R$ 280</s>/mês — em
          inglês. O MatchCV faz em português, com Pix, por uma fração disso.
        </p>
      </div>

      {cancelled && (
        <p className="animate-cardin mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sem problema — nada foi cobrado. Quando quiser, é só escolher de novo. 💡 Dica: o
          pacote no Pix não tem assinatura nenhuma.
        </p>
      )}

      {isPro && (
        <p className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm font-medium text-brand-700">
          ⚡ Você já é assinante Pro — análises ilimitadas. Obrigado!
        </p>
      )}
      {!isPro && credits > 0 && (
        <p className="mt-4 rounded-xl bg-olive-50 px-4 py-3 text-sm text-olive-800">
          Você tem <strong>{credits} {credits === 1 ? 'crédito' : 'créditos'}</strong> disponíveis
          — cada análise consome 1 quando o limite grátis do mês acaba.
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
          badge="Mais popular"
          price="R$ 19,90"
          period="/mês"
          subprice="menos que uma pizza — cancela quando quiser"
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
                {busy === 'pro' ? <Spinner label="Abrindo..." /> : 'Assinar Pro — R$ 19,90/mês'}
              </button>
            )
          }
        />
        <PlanCard
          name="Pacote de créditos"
          badge="Pix, sem assinatura"
          price="R$ 9,90"
          period=" · 10 análises"
          subprice="R$ 0,99 por análise, pra usar quando quiser"
          features={FEATURES_CREDITS}
          footer={
            <button
              onClick={() => handleBuy('credits')}
              disabled={!!busy}
              className="btn-secondary w-full"
            >
              {busy === 'credits' ? <Spinner label="Abrindo..." /> : 'Comprar no Pix — R$ 9,90'}
            </button>
          }
        />
      </div>

      {notice && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>
      )}

      {/* Sinais de confiança na hora da decisão */}
      <ul className="mt-8 grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-olive-100 text-olive-700">
            🔒
          </span>
          <span>
            Pagamento 100% pelo <strong>Mercado Pago</strong> — seus dados de cartão nunca passam
            pela gente.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-olive-100 text-olive-700">
            ↩️
          </span>
          <span>
            <strong>7 dias de arrependimento</strong> garantidos por lei (CDC). Não curtiu?
            Devolvemos.
          </span>
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-olive-100 text-olive-700">
            ✂️
          </span>
          <span>
            Cancela em 2 cliques na sua conta do Mercado Pago — sem ligação, sem e-mail pro
            suporte.
          </span>
        </li>
      </ul>

      <p className="mt-8 text-center text-xs text-slate-400">
        Dúvidas sobre cobrança, Pix ou cancelamento?{' '}
        <Link to="/faq" className="font-medium text-brand-600 hover:text-brand-700">
          Veja as perguntas frequentes
        </Link>
        .
      </p>
    </div>
  )
}

function PlanCard({ name, badge, price, period, subprice, features, highlight, footer }) {
  return (
    <div
      className={`card relative flex flex-col gap-4 p-6 ${
        highlight ? 'border-brand-300 ring-2 ring-brand-200' : ''
      }`}
    >
      {badge && (
        <span
          className={`absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
            highlight ? 'bg-brand-600 text-white' : 'bg-olive-100 text-olive-700'
          }`}
        >
          {badge}
        </span>
      )}
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{name}</h2>
        <p className="mt-1">
          <span className="font-display text-3xl font-semibold text-slate-900">{price}</span>
          <span className="text-sm text-slate-400">{period}</span>
        </p>
        {subprice && <p className="mt-1 text-xs text-slate-400">{subprice}</p>}
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
