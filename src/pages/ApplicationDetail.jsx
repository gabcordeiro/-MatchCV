import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { generateApplication } from '../lib/api.js'
import { exportLetterPdf } from '../lib/exportPdf.js'
import { useProfile } from '../context/ProfileContext.jsx'
import StageSelect from '../components/StageSelect.jsx'
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx'

export default function ApplicationDetail() {
  const { id } = useParams()
  const { profile, reload: reloadProfile } = useProfile()

  const [application, setApplication] = useState(null)
  const [resumeText, setResumeText] = useState(null)
  const [resumes, setResumes] = useState([])
  const [selectedResumeId, setSelectedResumeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [letter, setLetter] = useState('')
  const [editing, setEditing] = useState(false)
  const [savingLetter, setSavingLetter] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const [notes, setNotes] = useState('')
  const [notesStatus, setNotesStatus] = useState('') // '' | 'saving' | 'saved'
  const [followUp, setFollowUp] = useState('')

  async function load() {
    setLoading(true)
    const [{ data, error: err }, resumesRes] = await Promise.all([
      supabase
        .from('applications')
        .select(
          'id, company_name, job_description, job_url, notes, follow_up_at, score_history, generated_letter, match_analysis, status, stage, resume_id, created_at',
        )
        .eq('id', id)
        .single(),
      supabase
        .from('resumes')
        .select('id, title, extracted_text, created_at')
        .order('created_at', { ascending: false }),
    ])

    if (err) setError(err.message)
    else {
      setApplication(data)
      setLetter(data.generated_letter ?? '')
      setNotes(data.notes ?? '')
      setFollowUp(data.follow_up_at ? String(data.follow_up_at).slice(0, 10) : '')
      const allResumes = resumesRes.data ?? []
      setResumes(allResumes)
      // Currículo usado nesta análise (repositório) → também é o pré-selecionado.
      const activeId = data.resume_id || allResumes[0]?.id || ''
      setSelectedResumeId(activeId)
      const active = allResumes.find((r) => r.id === activeId)
      setResumeText(active?.extracted_text ?? null)
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
    // Se o usuário escolheu outro currículo, vincula antes de gerar.
    if (selectedResumeId && selectedResumeId !== application.resume_id) {
      const { error: linkErr } = await supabase
        .from('applications')
        .update({ resume_id: selectedResumeId })
        .eq('id', id)
      if (linkErr) {
        setRegenerating(false)
        setError(linkErr.message)
        return
      }
    }
    const { data: genData, error: genErr } = await generateApplication(id)
    setRegenerating(false)
    if (genErr) {
      setError(genErr)
      return
    }

    // Registra o score desta geração no histórico (comparativo de versões).
    // Feito aqui (RLS permite o dono escrever) em vez de na Edge Function,
    // então funciona mesmo sem redeploy da função.
    const newScore = genData?.match_analysis?.match_score
    if (typeof newScore === 'number') {
      const prevHistory = Array.isArray(application?.score_history) ? application.score_history : []
      const resumeIdUsed = selectedResumeId || application?.resume_id || null
      const score_history = [
        ...prevHistory,
        { resume_id: resumeIdUsed, score: newScore, at: new Date().toISOString() },
      ].slice(-12)
      await supabase.from('applications').update({ score_history }).eq('id', id)
    }

    await load()
    reloadProfile() // atualiza o contador de gerações do plano
  }

  async function saveNotes() {
    if (notes === (application.notes ?? '')) return
    setNotesStatus('saving')
    const { error: err } = await supabase
      .from('applications')
      .update({ notes })
      .eq('id', id)
    if (err) {
      setNotesStatus('')
      setError(err.message)
      return
    }
    setApplication((prev) => ({ ...prev, notes }))
    setNotesStatus('saved')
    setTimeout(() => setNotesStatus(''), 1500)
  }

  async function saveFollowUp(value) {
    setFollowUp(value)
    const { error: err } = await supabase
      .from('applications')
      .update({ follow_up_at: value || null })
      .eq('id', id)
    if (err) setError(err.message)
    else setApplication((prev) => ({ ...prev, follow_up_at: value || null }))
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
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            Análise da candidatura
            {application.job_url && (
              <a
                href={application.job_url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                🔗 abrir a vaga
              </a>
            )}
          </p>
        </div>
        <div className="shrink-0">
          <StageSelect
            value={application.stage || 'saved'}
            onChange={handleStageChange}
            size="md"
          />
        </div>
      </div>

      {/* Regerar escolhendo a versão do currículo (inclusive uma recém-enviada) */}
      <div className="card mt-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
          <span className="text-slate-500">Currículo desta análise:</span>
          {resumes.length > 1 ? (
            <select
              value={selectedResumeId}
              onChange={(e) => setSelectedResumeId(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          ) : (
            <span className="font-medium text-slate-800">
              {resumes[0]?.title ?? 'Currículo principal'}{' '}
              <Link to="/dashboard/profile" className="text-xs font-normal text-brand-600">
                (enviar outro)
              </Link>
            </span>
          )}
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="btn-primary shrink-0"
        >
          {regenerating ? (
            <Spinner label="Gerando..." />
          ) : hasResult ? (
            selectedResumeId !== application.resume_id ? (
              'Gerar com este currículo'
            ) : (
              'Gerar novamente'
            )
          ) : (
            'Gerar agora'
          )}
        </button>
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

          {/* ===== Comparativo de versões do currículo ===== */}
          <ScoreComparison history={application.score_history} resumes={resumes} />

          {/* ===== Cobrir lacunas: termos faltantes → frases prontas ===== */}
          {analysis?.keywords_missing?.length > 0 && (
            <GapFiller keywords={analysis.keywords_missing} />
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
                  onClick={() => exportLetterPdf(letter, application.company_name)}
                  className="btn-secondary"
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

      {/* ===== Anotações da candidatura (contatos, datas, follow-up) ===== */}
      <div className="card mt-6 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Suas anotações</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Só você vê. Registre contatos, datas, o que combinou na entrevista.
            </p>
          </div>
          {notesStatus === 'saving' && <span className="text-xs text-slate-400">salvando…</span>}
          {notesStatus === 'saved' && <span className="text-xs text-olive-600">✓ salvo</span>}
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={4}
          className="input mt-4 resize-y text-sm leading-relaxed"
          placeholder={
            'Ex.: Recrutadora Ana (LinkedIn) — respondeu dia 03/07.\nEntrevista técnica marcada p/ 10/07 às 15h.\nRevisar projeto de RV antes.'
          }
        />
        <p className="mt-1.5 text-xs text-slate-400">Salva automaticamente ao sair do campo.</p>

        {/* Lembrete de follow-up (vira badge no kanban) */}
        <div className="mt-5 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="followup" className="text-sm font-medium text-slate-700">
              ⏰ Dar retorno em
            </label>
            <p className="text-xs text-slate-400">Aparece como lembrete no card do kanban.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              id="followup"
              type="date"
              value={followUp}
              onChange={(e) => saveFollowUp(e.target.value)}
              className="input w-auto py-1.5 text-sm"
            />
            {followUp && (
              <button
                onClick={() => saveFollowUp('')}
                className="btn-ghost px-2 py-1 text-xs text-slate-400"
              >
                limpar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ===== Comparativo de score por versão do currículo ===== */
function ScoreComparison({ history, resumes = [] }) {
  const entries = Array.isArray(history) ? history : []
  if (entries.length < 2) return null

  const titleFor = (rid) => resumes.find((r) => r.id === rid)?.title || 'Currículo'
  const best = Math.max(...entries.map((e) => Number(e.score) || 0))

  return (
    <div className="card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">Evolução desta análise</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        Cada vez que você gera, guardamos o score — dá pra ver qual currículo combina mais.
      </p>
      <ol className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-3">
        {entries.map((e, i) => {
          const score = Number(e.score) || 0
          const isBest = score === best
          return (
            <li key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">→</span>}
              <div
                className={`rounded-xl border px-3 py-2 text-center ${
                  isBest ? 'border-olive-300 bg-olive-50' : 'border-slate-200 bg-white'
                }`}
              >
                <div className={`font-display text-lg font-semibold ${isBest ? 'text-olive-700' : 'text-slate-800'}`}>
                  {score}%
                </div>
                <div className="max-w-[120px] truncate text-[11px] text-slate-400">
                  {titleFor(e.resume_id)}
                  {isBest && ' ★'}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/* ===== Cobrir lacunas: cada termo faltante vira uma frase pronta ===== */
function GapFiller({ keywords = [] }) {
  const [copiedIdx, setCopiedIdx] = useState(-1)

  function phraseFor(kw) {
    return `${kw}: [descreva onde você usou ${kw} e qual resultado entregou].`
  }

  async function copy(kw, i) {
    try {
      await navigator.clipboard.writeText(phraseFor(kw))
      setCopiedIdx(i)
      setTimeout(() => setCopiedIdx(-1), 1500)
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="card mt-6 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900">Cubra as lacunas do currículo</h2>
      <p className="mt-0.5 text-sm text-slate-500">
        A vaga pede estes termos e eles não apareceram. Se você tem essa experiência, adicione
        uma linha — copie o modelo e complete.
      </p>
      <ul className="mt-4 grid gap-2">
        {keywords.map((kw, i) => (
          <li
            key={`${kw}-${i}`}
            className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3"
          >
            <p className="text-sm text-slate-700">
              <span className="font-semibold text-slate-900">• {kw}</span>{' '}
              <span className="text-slate-500">
                [descreva onde você usou {kw} e qual resultado entregou].
              </span>
            </p>
            <button
              onClick={() => copy(kw, i)}
              className="btn-ghost shrink-0 px-2 py-1 text-xs"
            >
              {copiedIdx === i ? '✓' : 'Copiar'}
            </button>
          </li>
        ))}
      </ul>
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
