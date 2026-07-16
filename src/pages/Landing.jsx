import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from '../components/Logo.jsx'

export default function Landing() {
  const { session } = useAuth()
  const primaryTo = session ? '/dashboard' : '/auth'

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Logo to="/" />
        <Link to={primaryTo} className="btn-ghost text-sm">
          {session ? 'Ir para o app' : 'Entrar'}
        </Link>
      </header>

      <main>
        {/* ===== Hero: afirmação direta + demo funcional ===== */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
                Análise de currículo com IA — em português, pro Brasil
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.05] text-slate-900 sm:text-5xl lg:text-[3.4rem]">
                Seu currículo tem{' '}
                <em className="font-display italic text-brand-600">7 segundos</em> pra
                convencer. A gente faz cada um valer.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-slate-600">
                Cole a vaga. Cole seu currículo. O MatchCV mostra exatamente o que o
                recrutador procura e você não colocou — e já deixa a carta de
                apresentação pronta.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link to={primaryTo} className="btn-primary px-7 py-3.5 text-base">
                  Analisar meu currículo grátis
                </Link>
                <span className="text-sm text-slate-500">
                  3 análises por mês. Sem cartão.
                </span>
              </div>
            </div>

            <LiveDemo />
          </div>
        </section>

        {/* ===== Faixa escura: o teste dos 7 segundos ===== */}
        <section className="bg-slate-900 py-16 text-slate-50 sm:py-20">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <h2 className="text-3xl font-medium leading-tight sm:text-4xl">
                  Um recrutador não lê seu currículo.
                  <br />
                  <em className="italic text-brand-300">Ele escaneia.</em>
                </h2>
                <p className="mt-4 max-w-md text-slate-300">
                  Numa vaga com 200 candidatos, a primeira triagem dura segundos. O
                  MatchCV simula esse filtro: um cronômetro de 7 segundos sobre o topo
                  do seu currículo, mostrando o que sobrevive — e o que ninguém chega a
                  ver.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>O que o recrutador vê</span>
                  <span className="font-mono">0:07</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                  <div className="animate-drain h-full rounded-full bg-brand-500" />
                </div>
                <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
                  <p>
                    <span className="rounded bg-olive-500/20 px-1 font-medium text-olive-200">
                      Analista de Dados
                    </span>{' '}
                    · 4 anos ·{' '}
                    <span className="rounded bg-olive-500/20 px-1 font-medium text-olive-200">
                      SQL
                    </span>
                    ,{' '}
                    <span className="rounded bg-olive-500/20 px-1 font-medium text-olive-200">
                      Power BI
                    </span>
                    , Excel avançado…
                  </p>
                  <p className="text-slate-500">
                    …experiência com relatórios gerenciais e rotinas administrativas em
                    empresa de médio porte, atuando também no suporte a…{' '}
                    <span className="text-slate-600">← daqui pra baixo, ninguém leu.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== O que sai de cada análise (lista editorial, sem cards) ===== */}
        <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            <h2 className="text-3xl font-medium leading-tight text-slate-900 sm:text-4xl">
              Menos "boa sorte",
              <br />
              mais método.
            </h2>
            <ul className="divide-y divide-slate-200 border-y border-slate-200">
              {[
                ['Carta de apresentação pronta', 'no tom da vaga, sem clichê de "sou proativo e dinâmico".'],
                ['A lista exata do que falta', 'os termos que a vaga pede e seu currículo não mostra — pra você corrigir antes de enviar.'],
                ['5 perguntas prováveis da entrevista', 'com uma dica de resposta baseada no SEU currículo, não em manual genérico.'],
                ['Kanban de candidaturas', 'da vaga salva até a oferta, pra você parar de se organizar por print e planilha.'],
              ].map(([title, desc]) => (
                <li key={title} className="flex gap-4 py-5">
                  <span aria-hidden="true" className="mt-1 font-display text-xl leading-none text-brand-600">
                    —
                  </span>
                  <p className="text-slate-600">
                    <span className="font-semibold text-slate-900">{title}</span>{' '}
                    {desc}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ===== Preço honesto, uma linha ===== */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-8 sm:px-10">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-medium text-slate-900">
                  Grátis pra testar. Barato pra usar de verdade.
                </h2>
                <p className="mt-2 text-slate-600">
                  <span className="font-semibold text-slate-900">Free:</span> 3 análises
                  por mês. <span className="font-semibold text-slate-900">Pro:</span>{' '}
                  R$ 19,90/mês, ilimitado + preparação de entrevista. Ou{' '}
                  <span className="font-semibold text-slate-900">10 análises por R$ 9,90</span>{' '}
                  no Pix, sem assinatura. Cancela quando quiser, sem drama.
                </p>
              </div>
              <Link to={primaryTo} className="btn-primary shrink-0 px-7 py-3.5 text-base">
                Começar agora
              </Link>
            </div>
            <p className="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
              🇧🇷 Feito no Brasil, em português de verdade — não é tradução capenga de
              ferramenta gringa. Sua primeira análise sai em ~15 segundos.
            </p>
            <ul className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
              <li className="flex items-center gap-1.5">
                <ShieldIcon /> Pagamento seguro via <strong className="text-slate-700">Mercado Pago</strong> — Pix ou cartão
              </li>
              <li className="flex items-center gap-1.5">
                <LockIcon /> Seu currículo é seu: dados protegidos e nunca compartilhados
              </li>
              <li className="flex items-center gap-1.5">
                <CheckIcon /> Cancela em 2 cliques, sem ligação nem e-mail pro suporte
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 text-sm text-slate-500 sm:flex-row sm:px-6">
          <Logo to="/" />
          <span className="text-center">
            Feito para quem cansou de mandar currículo no vazio. ©{' '}
            {new Date().getFullYear()} MatchCV
          </span>
        </div>
      </footer>
    </div>
  )
}

/* Ícones minúsculos da faixa de confiança (inline pra não puxar lib de ícones). */
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-olive-600" fill="none" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.5 12l2 2 3.5-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-olive-600" fill="none" aria-hidden="true">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-olive-600" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* Demo funcional do hero: keywords da vaga "acendendo" contra o currículo,
   com o score subindo em tempo real — o produto de verdade, não ilustração. */
const DEMO_TERMS = [
  { term: 'SQL', found: true },
  { term: 'Power BI', found: true },
  { term: 'Dashboards', found: true },
  { term: 'ETL', found: false },
  { term: 'Inglês avançado', found: false },
]

function LiveDemo() {
  const [revealed, setRevealed] = useState(0)
  const [score, setScore] = useState(0)

  // Revela um termo por vez.
  useEffect(() => {
    if (revealed >= DEMO_TERMS.length) return
    const t = setTimeout(() => setRevealed((r) => r + 1), 700)
    return () => clearTimeout(t)
  }, [revealed])

  // Score persegue o alvo conforme os termos aparecem.
  useEffect(() => {
    const foundSoFar = DEMO_TERMS.slice(0, revealed).filter((d) => d.found).length
    const target = Math.round((foundSoFar / DEMO_TERMS.length) * 100)
    if (score === target) return
    const t = setTimeout(() => setScore((s) => (s < target ? s + 1 : s - 1)), 25)
    return () => clearTimeout(t)
  }, [revealed, score])

  const missingShown = DEMO_TERMS.slice(0, revealed).filter((d) => !d.found).length
  const done = revealed >= DEMO_TERMS.length

  return (
    <div aria-hidden="true" className="card p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Analisando contra</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            Analista de Dados Pleno · Vaga real
          </p>
        </div>
        <span className="font-display text-3xl font-semibold text-slate-900">
          {score}
          <span className="text-base font-normal text-slate-400">%</span>
        </span>
      </div>

      <div className="mt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          Termos que a vaga pede
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEMO_TERMS.map((d, i) => {
            const shown = i < revealed
            if (!shown) {
              return (
                <span
                  key={d.term}
                  className="h-6 w-16 animate-pulse rounded-full bg-slate-100"
                />
              )
            }
            return d.found ? (
              <span
                key={d.term}
                className="rounded-full border border-olive-200 bg-olive-50 px-2.5 py-1 text-xs font-medium text-olive-700"
              >
                ✓ {d.term}
              </span>
            ) : (
              <span
                key={d.term}
                className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                + {d.term}
              </span>
            )
          })}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand-600 transition-all duration-200"
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          {done ? (
            <>
              <span className="font-semibold text-slate-900">{score}% de match.</span>{' '}
              {missingShown} termos faltando no currículo — e a carta já está pronta.
            </>
          ) : (
            'Comparando currículo e vaga…'
          )}
        </p>
      </div>
    </div>
  )
}
