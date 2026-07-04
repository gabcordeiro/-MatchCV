import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { generateApplication } from '../lib/api.js'
import { useProfile } from '../context/ProfileContext.jsx'
import { STAGES } from './Dashboard.jsx'
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx'

export default function ApplicationDetail() {
  const { id } = useParams()
  const { profile, reload: reloadProfile } = useProfile()

  const [application, setApplication] = useState(null)
  const [resumeText, setResumeText] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [letter, setLetter] = useState('')
  const [editing, setEditing] = useState(false)
  const [savingLetter, setSavingLetter] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('applications')
      .select('id, company_name, job_description, generated_letter, match_analysis, status, stage, resume_id, created_at')
      .eq('id', id)
      .single()

    if (err) setError(err.message)
    else {
      setApplication(data)
      setLetter(data.generated_letter ?? '')
      // Usa a versão do currículo vinculada a ESTA análise (repositório).
      if (data.resume_id) {
        const { data: r } = await supabase
          .from('resumes')
          .select('extracted_text')
          .eq('id', data.resume_id)
          .maybeSingle()
        setResumeText(r?.extracted_text ?? null)
      } else {
        setResumeText(null)
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function handleRegenerate() {
    setError(null)
    setRegenerating(true)
    const { error: genErr } = await generateApplication(id)
    setRegenerating(false)
    if (genErr) {
      setError(genErr)
      return
    }
    await load()
    reloadProfile() // atualiza o contador de gerações do plano
  }

  async function handleStageChange(stage) {
    setError(null)
    const prev = application
    setApplication((a) => ({ ...a, stage }))
    const { error: err } = await supabase.from('applications').update({ stage }).eq('id', id)
    if (err) {
      setApplication(prev)
      setError(err.message)
    }
  }

  async function handleSaveLetter() {
    setSavingLetter(true)
    const { error: err } = await supabase
      .from('applications')
      .update({ generated_letter: letter })
      .eq('id', id)
    setSavingLetter(false)
    if (err) setError(err.message)
    else {
      setApplication((prev) => ({ ...prev, generated_letter: letter }))
      setEditing(false)
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(letter)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Não foi possível copiar. Copie manualmente.')
    }
  }

  if (loading) return <FullPageSpinner />

  if (!application) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-slate-600">Aplicação não encontrada.</p>
        <Link to="/dashboard" className="btn-secondary mt-4 inline-flex">
          Voltar ao dashboard
        </Link>
      </div>
    )
  }

  const analysis = application.match_analysis
  const hasResult = Boolean(application.generated_letter)
  const title = application.company_name?.trim() || 'Vaga sem empresa'
  const allKeywords = [
    ...(analysis?.keywords_present ?? []),
    ...(analysis?.keywords_missing ?? []),
  ]

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para o dashboard
      </Link>

      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Análise da candidatura</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <select
            value={application.stage || 'saved'}
            onChange={(e) => handleStageChange(e.target.value)}
            title="Etapa da candidatura"
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <button onClick={handleRegenerate} disabled={regenerating} className="btn-secondary">
            {regenerating ? <Spinner label="Gerando..." /> : hasResult ? 'Gerar novamente' : 'Gerar agora'}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          {error.includes('Pro') && (
            <>
              {' '}
              <Link to="/dashboard/upgrade" className="font-semibold underline underline-offset-2">
                Ver planos
              </Link>
            </>
          )}
        </p>
      )}

      {!hasResult && !regenerating && (
        <div className="card mt-6 p-6 text-center text-sm text-slate-600">
          Esta aplicação ainda não tem uma análise. Clique em{' '}
          <span className="font-semibold">Gerar agora</span> para criar a carta, o match e
          as dicas de entrevista.
        </div>
      )}

      {hasResult && (
        <>
          {/* ===== Score + diff de keywords ===== */}
          {analysis && (
            <div className="card mt-6 overflow-hidden">
              <ScoreBlock score={analysis.match_score} />
              <div className="grid gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-2">
                <KeywordGroup
                  tone="present"
                  title="Seu currículo já mostra"
                  keywords={analysis.keywords_present}
                  emptyText="Nenhum termo da vaga encontrado no currículo."
                />
                <KeywordGroup
                  tone="missing"
                  title="A vaga pede e não está lá"
                  keywords={analysis.keywords_missing}
                  emptyText="Nada faltando — currículo cobre a vaga."
                />
              </div>
            </div>
          )}

          {/* ===== Teste dos 7 segundos ===== */}
          <SevenSecondsTest resume={resumeText || profile?.base_resume} keywords={allKeywords} />

          {/* ===== Carta (diff em modo leitura + edição) ===== */}
          <div className="card mt-6 p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Carta de apresentação</h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  Termos da vaga aparecem{' '}
                  <mark className="rounded bg-olive-100 px-1 text-olive-800">marcados</mark> na
                  carta.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <AudioMentor analysis={analysis} company={application.company_name} />
                <button onClick={handleCopy} className="btn-ghost text-sm">
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>

            {editing ? (
              <textarea
                value={letter}
                onChange={(e) => setLetter(e.target.value)}
                rows={16}
                className="input mt-4 resize-y text-sm leading-relaxed"
              />
            ) : (
              <HighlightedText
                text={letter}
                keywords={analysis?.keywords_present ?? []}
                className="mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-800"
              />
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                {editing ? (
                  <button
                    onClick={handleSaveLetter}
                    disabled={savingLetter || letter === application.generated_letter}
                    className="btn-primary"
                  >
                    {savingLetter ? <Spinner label="Salvando..." /> : 'Salvar edições'}
                  </button>
                ) : (
                  <button onClick={() => setEditing(true)} className="btn-primary">
                    Editar carta
                  </button>
                )}
                <button
                  onClick={() => alert('Exportação em PDF chega na próxima etapa.')}
                  className="btn-secondary"
                  title="Em breve"
                >
                  Exportar PDF
                </button>
              </div>
              {letter !== application.generated_letter && (
                <span className="text-xs text-amber-600">Alterações não salvas</span>
              )}
            </div>
          </div>

          {/* ===== Preparação para a entrevista (recurso Pro) ===== */}
          {analysis?.tips_locked && (
            <div className="card mt-6 border-dashed p-6 text-center sm:p-8">
              <span className="text-2xl" aria-hidden="true">
                🔒
              </span>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Perguntas prováveis da entrevista
              </h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                Assinantes Pro recebem 5 perguntas que essa vaga provavelmente vai fazer —
                com a dica de resposta baseada no <em>seu</em> currículo.
              </p>
              <Link to="/dashboard/upgrade" className="btn-primary mt-4 inline-flex">
                Desbloquear com o Pro
              </Link>
            </div>
          )}
          {Array.isArray(analysis?.interview_tips) && analysis.interview_tips.length > 0 && (
            <div className="card mt-6 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-slate-900">
                Prepare-se para a entrevista
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Perguntas prováveis desta vaga e como responder com base no seu currículo.
              </p>
              <ul className="mt-4 grid gap-3">
                {analysis.interview_tips.map((t, i) => (
                  <li key={i} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">{t.question}</p>
                    {t.tip && <p className="mt-1.5 text-sm text-slate-600">{t.tip}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ===== Score sem círculo: número serifado que CONTA até o valor + veredito ===== */
function ScoreBlock({ score = 0 }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0))
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    let raf
    const start = performance.now()
    const duration = 900
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplay(Math.round(value * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  const verdict =
    value >= 75
      ? 'Forte. Ajusta os detalhes e manda.'
      : value >= 50
        ? 'Dá pra melhorar antes de enviar.'
        : 'Ainda não. Cubra as lacunas antes de aplicar.'
  const barColor = value >= 75 ? 'bg-olive-500' : value >= 50 ? 'bg-brand-500' : 'bg-amber-500'

  return (
    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Match com a vaga
        </p>
        <p className="mt-1 font-display text-6xl font-semibold leading-none text-slate-900">
          {display}
          <span className="text-2xl font-normal text-slate-400">/100</span>
        </p>
      </div>
      <div className="w-full sm:max-w-xs">
        <p className="text-sm font-medium text-slate-700">{verdict}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${display}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function KeywordGroup({ title, tone, keywords = [], emptyText }) {
  const chip =
    tone === 'present'
      ? 'border-olive-200 bg-olive-50 text-olive-700'
      : 'border-amber-200 bg-amber-50 text-amber-800'
  return (
    <div className="bg-white p-5 sm:p-6">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {keywords.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {keywords.map((kw, i) => (
            <li
              key={`${kw}-${i}`}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${chip}`}
            >
              {tone === 'present' ? '✓ ' : '+ '}
              {kw}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ===== Simulação do primeiro filtro: 7 segundos no topo do currículo ===== */
function SevenSecondsTest({ resume, keywords = [] }) {
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [remaining, setRemaining] = useState(7)

  useEffect(() => {
    if (phase !== 'running') return
    if (remaining <= 0) {
      setPhase('done')
      return
    }
    const t = setTimeout(() => setRemaining((r) => Math.round((r - 0.1) * 10) / 10), 100)
    return () => clearTimeout(t)
  }, [phase, remaining])

  const excerpt = (resume ?? '').slice(0, 400)
  const terms = keywords.filter((k) => k && k.trim().length >= 2)
  const seen = terms.filter((k) => excerpt.toLowerCase().includes(k.toLowerCase()))

  if (!resume || terms.length === 0) return null

  const survives = seen.length / terms.length >= 0.5

  return (
    <div className="card mt-6 p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">O teste dos 7 segundos</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            O que um recrutador realmente vê no topo do seu currículo antes de decidir.
          </p>
        </div>
        {phase === 'idle' && (
          <button
            onClick={() => {
              setRemaining(7)
              setPhase('running')
            }}
            className="btn-primary"
          >
            Rodar o teste
          </button>
        )}
        {phase === 'done' && (
          <button
            onClick={() => {
              setRemaining(7)
              setPhase('running')
            }}
            className="btn-ghost text-sm"
          >
            Refazer
          </button>
        )}
        {phase === 'running' && (
          <span className="font-mono text-lg font-semibold text-brand-600">
            0:{String(Math.max(0, Math.ceil(remaining))).padStart(2, '0')}
          </span>
        )}
      </div>

      {phase !== 'idle' && (
        <>
          {phase === 'running' && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-100"
                style={{ width: `${(remaining / 7) * 100}%` }}
              />
            </div>
          )}

          <HighlightedText
            text={excerpt + (resume.length > 400 ? '…' : '')}
            keywords={seen}
            className={`mt-4 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700 transition-opacity ${
              phase === 'done' ? 'opacity-50' : ''
            }`}
          />

          {phase === 'done' && (
            <p
              className={`mt-4 rounded-xl px-4 py-3 text-sm font-medium ${
                survives ? 'bg-olive-50 text-olive-800' : 'bg-amber-50 text-amber-800'
              }`}
            >
              {survives
                ? `Você sobrevive à primeira triagem: ${seen.length} de ${terms.length} termos da vaga aparecem logo no topo.`
                : `Arriscado: só ${seen.length} de ${terms.length} termos da vaga aparecem nesses 7 segundos. Suba suas competências mais relevantes para o início do currículo.`}
            </p>
          )}
        </>
      )}
    </div>
  )
}

/* ===== Feedback em áudio: mentor de 30s via voz do navegador (grátis) ===== */
function AudioMentor({ analysis, company }) {
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel()
    }
  }, [supported])

  if (!supported || !analysis) return null

  function toggle() {
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utter = new SpeechSynthesisUtterance(buildMentorScript(analysis, company))
    utter.lang = 'pt-BR'
    utter.rate = 1.03
    const ptVoice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang?.toLowerCase().startsWith('pt'))
    if (ptVoice) utter.voice = ptVoice
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    setSpeaking(true)
    window.speechSynthesis.speak(utter)
  }

  return (
    <button onClick={toggle} className="btn-secondary text-sm">
      {speaking ? '⏹ Parar' : '🎧 Ouvir o mentor'}
    </button>
  )
}

function buildMentorScript(analysis, company) {
  const score = analysis?.match_score ?? 0
  const present = (analysis?.keywords_present ?? []).slice(0, 3)
  const missing = (analysis?.keywords_missing ?? []).slice(0, 3)
  let s = `Beleza, vamos direto ao ponto. `
  s += `Seu currículo tem ${score} por cento de compatibilidade com ${
    company?.trim() ? `a vaga da ${company.trim()}` : 'essa vaga'
  }. `
  if (present.length) {
    s += `Seus pontos fortes: ${present.join(', ')}. Isso já está no currículo — use logo no começo da conversa. `
  }
  if (missing.length) {
    s += `O que está faltando: ${missing.join(', ')}. Se você tem essa experiência, escreva no currículo hoje. Se não tem, prepare uma resposta pra quando perguntarem. `
  }
  s += `Revise a carta, deixe com a sua voz, e envie. Boa sorte.`
  return s
}

/* ===== Destaque de keywords dentro de um texto (diff estilo Grammarly) ===== */
function HighlightedText({ text, keywords = [], className = '' }) {
  const parts = useMemo(() => splitByKeywords(text, keywords), [text, keywords])
  return (
    <div className={className}>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded bg-olive-100 px-0.5 font-medium text-olive-900">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </div>
  )
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitByKeywords(text, keywords) {
  const terms = (keywords ?? []).map((k) => String(k).trim()).filter((k) => k.length >= 2)
  if (!text || terms.length === 0) return [{ text: text ?? '', hit: false }]
  const re = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'gi')
  const lower = new Set(terms.map((t) => t.toLowerCase()))
  return text
    .split(re)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, hit: lower.has(part.toLowerCase()) }))
}
