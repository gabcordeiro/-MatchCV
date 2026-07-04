import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { extractPdfText } from '../lib/pdf.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../context/ProfileContext.jsx'
import AvatarUpload from '../components/AvatarUpload.jsx'
import Spinner from '../components/Spinner.jsx'

const MAX_PDF_BYTES = 5 * 1024 * 1024 // 5 MB

export default function Profile() {
  const { user } = useAuth()
  const { profile } = useProfile()

  const [resumes, setResumes] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function load() {
    setLoading(true)
    const [resumesRes, appsRes] = await Promise.all([
      supabase
        .from('resumes')
        .select('id, title, file_path, extracted_text, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('applications')
        .select('id, resume_id, company_name, match_analysis, created_at')
        .order('created_at', { ascending: true }),
    ])
    if (resumesRes.error) setError(resumesRes.error.message)
    else setResumes(resumesRes.data ?? [])
    if (!appsRes.error) setAnalyses(appsRes.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const scored = analyses.filter(
    (a) => typeof a.match_analysis?.match_score === 'number',
  )

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para o dashboard
      </Link>

      <h1 className="mt-3 text-3xl font-semibold text-slate-900">Meu perfil</h1>

      {/* Identidade + plano */}
      <div className="card mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <AvatarUpload />
        <div className="text-sm sm:text-right">
          <p className="font-medium text-slate-900">{user?.email}</p>
          <p className="mt-1">
            {profile?.plan === 'pro' ? (
              <span className="rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                ⚡ Plano Pro
              </span>
            ) : (
              <Link
                to="/dashboard/upgrade"
                className="text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                Plano Free — fazer upgrade →
              </Link>
            )}
          </p>
        </div>
      </div>

      {/* Evolução do score (gamificação sutil, sem gráfico decorativo) */}
      {scored.length >= 2 && <ScoreEvolution scored={scored} />}

      {/* Repositório de currículos */}
      <div className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Meus currículos</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Cada versão fica guardada — reanalise com vagas novas sem subir de novo.
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <div className="grid place-items-center py-12 text-brand-600">
          <Spinner className="h-7 w-7" />
        </div>
      ) : (
        <>
          <ResumeUploader onAdded={load} isEmpty={resumes.length === 0} />
          {resumes.length > 0 && (
            <ul className="mt-4 grid gap-3">
              {resumes.map((r) => (
                <ResumeRow key={r.id} resume={r} analyses={analyses} onChanged={load} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

/* ===== "Seu currículo melhorou X pontos desde a v1" ===== */
function ScoreEvolution({ scored }) {
  const first = scored[0].match_analysis.match_score
  const last = scored[scored.length - 1].match_analysis.match_score
  const delta = last - first
  const best = Math.max(...scored.map((a) => a.match_analysis.match_score))

  return (
    <div className="card mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Evolução do seu match
        </p>
        <p className="mt-1 font-display text-3xl font-semibold text-slate-900">
          {first}
          <span className="mx-2 text-xl text-slate-400">→</span>
          {last}
          {delta !== 0 && (
            <span
              className={`ml-2 text-lg ${delta > 0 ? 'text-olive-600' : 'text-amber-600'}`}
            >
              {delta > 0 ? `+${delta}` : delta} pts
            </span>
          )}
        </p>
      </div>
      <p className="text-sm text-slate-500 sm:max-w-[220px] sm:text-right">
        {scored.length} análises feitas · melhor score até agora:{' '}
        <span className="font-semibold text-slate-900">{best}</span>
      </p>
    </div>
  )
}

/* ===== Upload de PDF + colar texto (estado vazio com CTA claro) ===== */
function ResumeUploader({ onAdded, isEmpty }) {
  const { user } = useAuth()
  const fileRef = useRef(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteTitle, setPasteTitle] = useState('')
  const [pasteText, setPasteText] = useState('')

  async function handlePdf(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)

    if (file.type !== 'application/pdf') {
      setError('Envie um arquivo PDF.')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      setError('O PDF deve ter no máximo 5 MB.')
      return
    }

    setBusy(true)
    try {
      const text = await extractPdfText(file)
      if (text.length < 100) {
        throw new Error(
          'Não consegui ler o texto desse PDF (parece escaneado/imagem). Use a opção "colar texto".',
        )
      }

      const path = `${user.id}/${Date.now()}.pdf`
      const { error: upErr } = await supabase.storage
        .from('resumes')
        .upload(path, file, { contentType: 'application/pdf' })
      if (upErr) throw upErr

      const { error: insErr } = await supabase.from('resumes').insert({
        user_id: user.id,
        title: file.name.replace(/\.pdf$/i, ''),
        file_path: path,
        extracted_text: text,
      })
      if (insErr) throw insErr

      onAdded()
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o PDF.')
    } finally {
      setBusy(false)
    }
  }

  async function handlePasteSave() {
    setError(null)
    if (pasteText.trim().length < 100) {
      setError('Cole o currículo completo (mínimo ~100 caracteres).')
      return
    }
    setBusy(true)
    const { error: insErr } = await supabase.from('resumes').insert({
      user_id: user.id,
      title: pasteTitle.trim() || 'Currículo colado',
      extracted_text: pasteText.trim(),
    })
    setBusy(false)
    if (insErr) {
      setError(insErr.message)
      return
    }
    setPasteOpen(false)
    setPasteTitle('')
    setPasteText('')
    onAdded()
  }

  return (
    <div className={`card mt-4 p-6 ${isEmpty ? 'py-12 text-center' : ''}`}>
      {isEmpty && (
        <>
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 font-display text-2xl text-brand-600">
            ↑
          </span>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">
            Suba seu primeiro currículo
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            PDF ou texto colado. A partir dele, cada análise fica registrada aqui — e você
            acompanha seu score evoluindo versão a versão.
          </p>
        </>
      )}

      <div
        className={`flex flex-col gap-3 sm:flex-row ${isEmpty ? 'mt-6 justify-center' : 'items-center'}`}
      >
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? <Spinner label="Processando..." /> : '↑ Enviar PDF'}
        </button>
        <button
          onClick={() => setPasteOpen((v) => !v)}
          disabled={busy}
          className="btn-secondary"
        >
          Colar texto
        </button>
        {!isEmpty && (
          <span className="text-xs text-slate-400">PDF de até 5 MB, com texto selecionável.</span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          onChange={handlePdf}
          className="hidden"
        />
      </div>

      {pasteOpen && (
        <div className="mt-4 grid gap-3 text-left">
          <input
            type="text"
            value={pasteTitle}
            onChange={(e) => setPasteTitle(e.target.value)}
            className="input"
            placeholder="Nome desta versão (ex.: Currículo dados v2)"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            className="input resize-y font-mono text-[13px] leading-relaxed"
            placeholder="Cole aqui o texto completo do currículo"
          />
          <div className="flex gap-2">
            <button onClick={handlePasteSave} disabled={busy} className="btn-primary">
              {busy ? <Spinner label="Salvando..." /> : 'Salvar versão'}
            </button>
            <button onClick={() => setPasteOpen(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}

/* ===== Linha do repositório: stats, preview inline e ações ===== */
function ResumeRow({ resume, analyses, onChanged }) {
  const navigate = useNavigate()
  const [previewUrl, setPreviewUrl] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const linked = analyses.filter((a) => a.resume_id === resume.id)
  const scoredLinked = linked.filter((a) => typeof a.match_analysis?.match_score === 'number')
  const lastScore = scoredLinked.length
    ? scoredLinked[scoredLinked.length - 1].match_analysis.match_score
    : null

  async function togglePreview() {
    setError(null)
    if (previewOpen) {
      setPreviewOpen(false)
      return
    }
    if (resume.file_path && !previewUrl) {
      const { data, error: err } = await supabase.storage
        .from('resumes')
        .createSignedUrl(resume.file_path, 3600)
      if (err) {
        setError('Não foi possível abrir o PDF.')
        return
      }
      setPreviewUrl(data.signedUrl)
    }
    setPreviewOpen(true)
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${resume.title}"? As análises feitas com ele continuam salvas.`)) return
    setBusy(true)
    setError(null)
    if (resume.file_path) {
      await supabase.storage.from('resumes').remove([resume.file_path])
    }
    const { error: err } = await supabase.from('resumes').delete().eq('id', resume.id)
    setBusy(false)
    if (err) setError(err.message)
    else onChanged()
  }

  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">
              {resume.file_path ? '📄' : '📝'}
            </span>
            <h3 className="truncate font-semibold text-slate-900">{resume.title}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {formatDate(resume.created_at)} · {linked.length}{' '}
            {linked.length === 1 ? 'análise' : 'análises'}
            {lastScore !== null && (
              <>
                {' '}
                · último score{' '}
                <span className="font-semibold text-brand-600">{lastScore}%</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => navigate(`/dashboard/new?resume=${resume.id}`)}
            className="btn-primary text-sm"
          >
            Reanalisar com vaga nova
          </button>
          <button onClick={togglePreview} className="btn-secondary text-sm">
            {previewOpen ? 'Fechar' : resume.file_path ? 'Ver PDF' : 'Ver texto'}
          </button>
          <button
            onClick={handleDelete}
            disabled={busy}
            title="Excluir esta versão"
            className="btn-ghost text-sm text-slate-400 hover:text-red-600"
          >
            Excluir
          </button>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {previewOpen &&
        (resume.file_path ? (
          previewUrl ? (
            <iframe
              src={previewUrl}
              title={`Preview de ${resume.title}`}
              className="mt-4 h-[480px] w-full rounded-xl border border-slate-200 bg-white"
            />
          ) : (
            <div className="mt-4 grid place-items-center py-8 text-brand-600">
              <Spinner className="h-6 w-6" />
            </div>
          )
        ) : (
          <pre className="mt-4 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 font-sans text-sm leading-relaxed text-slate-700">
            {resume.extracted_text}
          </pre>
        ))}

      {/* Histórico de análises desta versão */}
      {scoredLinked.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Análises com esta versão
          </p>
          <ul className="mt-2 grid gap-1.5">
            {scoredLinked
              .slice()
              .reverse()
              .slice(0, 4)
              .map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/dashboard/app/${a.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50"
                  >
                    <span className="truncate text-slate-700">
                      {a.company_name?.trim() || 'Vaga sem empresa'}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-slate-400">{formatDate(a.created_at)}</span>
                      <span className="font-semibold text-brand-600">
                        {a.match_analysis.match_score}%
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      )}
    </li>
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
