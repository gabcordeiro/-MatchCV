import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { instantScore } from '../lib/instantScore.js'
import Logo from '../components/Logo.jsx'
import Footer from '../components/Footer.jsx'

export default function Landing() {
  const { session, loading } = useAuth()

  // Já logado? A raiz do site leva direto pro app (não faz sentido mostrar a
  // página de venda pra quem já é usuário). Espera a sessão carregar pra não
  // decidir cedo demais no refresh; enquanto carrega, a landing aparece
  // normalmente pra visitante anônimo (que é o caso comum).
  if (!loading && session) return <Navigate to="/dashboard" replace />

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

            <InstantScore />
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

      <Footer />
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

/* Ferramenta REAL no hero: cola vaga + currículo → score na hora, sem login.
   Vence o concorrente na fricção zero e funila pro cadastro (onde sai a análise
   completa com IA). O cálculo é local (instantScore) — sem custo, sem abuso. */
const EXAMPLE_JOB =
  'Analista de Dados Pleno. Requisitos: SQL avançado, Power BI, construção de dashboards, modelagem de dados, ETL, inglês intermediário. Diferenciais: Python e experiência com métricas de produto.'
const EXAMPLE_RESUME =
  'Analista de dados com 4 anos de experiência. Domínio de SQL e Power BI, criação de dashboards gerenciais e relatórios. Experiência com modelagem de dados e métricas de produto. Excel avançado.'

function InstantScore() {
  const [job, setJob] = useState(EXAMPLE_JOB)
  const [resume, setResume] = useState(EXAMPLE_RESUME)
  const [result, setResult] = useState(null)
  const [display, setDisplay] = useState(0)
  const [error, setError] = useState(null)

  function handleCalc() {
    setError(null)
    const r = instantScore(job, resume)
    if (!r.ok) {
      setResult(null)
      setError(r.reason)
      return
    }
    setResult(r)
  }

  // Anima o número subindo até o score (game feel).
  useEffect(() => {
    if (!result) return
    setDisplay(0)
    let raf
    const start = performance.now()
    const dur = 800
    const tick = (t) => {
      const p = Math.min(1, (t - start) / dur)
      setDisplay(Math.round(result.score * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [result])

  // Guarda o texto pra pré-preencher a conta após o cadastro (menos atrito).
  function stashAndGo() {
    try {
      localStorage.setItem('matchcv:instant', JSON.stringify({ job, resume, at: Date.now() }))
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-900">Teste agora, sem cadastro</p>
        {result && (
          <span className="font-display text-3xl font-semibold text-slate-900">
            {display}
            <span className="text-base font-normal text-slate-400">%</span>
          </span>
        )}
      </div>

      <div className="mt-3 grid gap-2">
        <textarea
          value={job}
          onChange={(e) => setJob(e.target.value)}
          rows={3}
          className="input resize-none text-xs leading-relaxed"
          placeholder="Cole os requisitos da vaga aqui"
          aria-label="Requisitos da vaga"
        />
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          rows={3}
          className="input resize-none text-xs leading-relaxed"
          placeholder="Cole suas experiências / currículo aqui"
          aria-label="Seu currículo"
        />
      </div>

      {error && <p className="mt-2 text-xs text-amber-600">{error}</p>}

      <button onClick={handleCalc} className="btn-primary mt-3 w-full">
        Calcular meu score grátis
      </button>

      {result ? (
        <div className="animate-cardin mt-4">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{ width: `${display}%` }}
            />
          </div>

          {(result.present.length > 0 || result.missing.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.present.slice(0, 6).map((t) => (
                <span
                  key={`p-${t}`}
                  className="rounded-full border border-olive-200 bg-olive-50 px-2 py-0.5 text-[11px] font-medium text-olive-700"
                >
                  ✓ {t}
                </span>
              ))}
              {result.missing.slice(0, 5).map((t) => (
                <span
                  key={`m-${t}`}
                  className="rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700"
                >
                  + {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-slate-900 p-4 text-center">
            <p className="text-sm font-medium text-white">Isso é só a prévia por palavras-chave.</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              Crie sua conta grátis e receba a <strong className="text-white">carta pronta</strong>,
              a lista exata do que falta e as{' '}
              <strong className="text-white">perguntas da entrevista</strong>.
            </p>
            <Link
              to="/auth"
              onClick={stashAndGo}
              className="btn-primary mt-3 inline-flex w-full justify-center"
            >
              Ver minha análise completa grátis
            </Link>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          Prévia por palavras-chave. A análise completa com IA é feita após o cadastro.
        </p>
      )}
    </div>
  )
}
