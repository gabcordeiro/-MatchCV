import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { generateApplication } from '../lib/api.js'
import Spinner, { FullPageSpinner } from '../components/Spinner.jsx'

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [letter, setLetter] = useState('')
  const [savingLetter, setSavingLetter] = useState(false)
  const [copied, setCopied] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('applications')
      .select('id, company_name, job_description, generated_letter, match_analysis, status, created_at')
      .eq('id', id)
      .single()

    if (err) setError(err.message)
    else {
      setApplication(data)
      setLetter(data.generated_letter ?? '')
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
  }

  async function handleSaveLetter() {
    setSavingLetter(true)
    const { error: err } = await supabase
      .from('applications')
      .update({ generated_letter: letter })
      .eq('id', id)
    setSavingLetter(false)
    if (err) setError(err.message)
    else setApplication((prev) => ({ ...prev, generated_letter: letter }))
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

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para o dashboard
      </Link>

      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">Resultado da análise por IA</p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="btn-secondary shrink-0"
        >
          {regenerating ? <Spinner label="Gerando..." /> : hasResult ? 'Gerar novamente' : 'Gerar agora'}
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {!hasResult && !regenerating && (
        <div className="card mt-6 p-6 text-center text-sm text-slate-600">
          Esta aplicação ainda não tem uma carta gerada. Clique em{' '}
          <span className="font-semibold">Gerar agora</span> para criar a carta e a análise.
        </div>
      )}

      {hasResult && (
        <>
          {/* Match score + keywords */}
          {analysis && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <MatchScoreCard score={analysis.match_score} />
              <KeywordCard
                title="Presentes no currículo"
                tone="present"
                keywords={analysis.keywords_present}
                emptyText="Nenhuma palavra-chave identificada."
              />
              <KeywordCard
                title="Faltando no currículo"
                tone="missing"
                keywords={analysis.keywords_missing}
                emptyText="Nada faltando — ótimo!"
              />
            </div>
          )}

          {/* Cover letter */}
          <div className="card mt-6 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Carta de apresentação</h2>
              <button onClick={handleCopy} className="btn-ghost text-sm">
                {copied ? '✓ Copiado' : 'Copiar'}
              </button>
            </div>
            <textarea
              value={letter}
              onChange={(e) => setLetter(e.target.value)}
              rows={16}
              className="input mt-4 resize-y text-sm leading-relaxed"
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row-reverse">
                <button
                  onClick={handleSaveLetter}
                  disabled={savingLetter || letter === application.generated_letter}
                  className="btn-primary"
                >
                  {savingLetter ? <Spinner label="Salvando..." /> : 'Salvar edições'}
                </button>
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
        </>
      )}
    </div>
  )
}

function MatchScoreCard({ score = 0 }) {
  const value = Math.max(0, Math.min(100, Number(score) || 0))
  const tone =
    value >= 75 ? 'text-emerald-600' : value >= 50 ? 'text-brand-600' : 'text-amber-600'
  return (
    <div className="card flex flex-col items-center justify-center p-6 text-center">
      <span className={`text-4xl font-extrabold ${tone}`}>{value}%</span>
      <span className="mt-1 text-sm font-medium text-slate-500">de compatibilidade</span>
    </div>
  )
}

function KeywordCard({ title, tone, keywords = [], emptyText }) {
  const styles =
    tone === 'present'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : 'bg-orange-50 text-orange-700 border-orange-200'
  return (
    <div className="card p-5">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {keywords.length === 0 ? (
        <p className="mt-3 text-xs text-slate-400">{emptyText}</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {keywords.map((kw, i) => (
            <li
              key={`${kw}-${i}`}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${styles}`}
            >
              {kw}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
