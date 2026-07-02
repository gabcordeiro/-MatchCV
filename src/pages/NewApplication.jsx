import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { generateApplication } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useProfile } from '../context/ProfileContext.jsx'
import Spinner from '../components/Spinner.jsx'

export default function NewApplication() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()

  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [status, setStatus] = useState('') // '' | 'saving' | 'generating'
  const [error, setError] = useState(null)
  // Reaproveita o rascunho já criado se o usuário tentar de novo (evita duplicatas).
  const [draftId, setDraftId] = useState(null)

  const busy = status !== ''
  const hasResume = Boolean(profile?.base_resume)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!jobDescription.trim()) {
      setError('Cole a descrição da vaga para continuar.')
      return
    }

    const payload = {
      user_id: user.id,
      company_name: companyName.trim() || null,
      job_description: jobDescription.trim(),
      status: 'draft',
    }

    // 1. Salva (ou atualiza) o rascunho no banco.
    setStatus('saving')
    let id = draftId
    if (id) {
      const { error: updErr } = await supabase.from('applications').update(payload).eq('id', id)
      if (updErr) {
        setStatus('')
        setError(updErr.message)
        return
      }
    } else {
      const { data, error: insErr } = await supabase
        .from('applications')
        .insert(payload)
        .select('id')
        .single()
      if (insErr) {
        setStatus('')
        setError(insErr.message)
        return
      }
      id = data.id
      setDraftId(id)
    }

    // 2. Chama a IA para gerar carta + análise.
    setStatus('generating')
    const { error: genErr } = await generateApplication(id)
    setStatus('')

    if (genErr) {
      // O rascunho ficou salvo; leva para a tela de resultado para tentar de novo.
      setError(`${genErr} Seu rascunho foi salvo — você pode tentar gerar novamente.`)
      navigate(`/dashboard/app/${id}`, { replace: true })
      return
    }

    navigate(`/dashboard/app/${id}`, { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para o dashboard
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Nova aplicação</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cole a descrição da vaga. A IA vai gerar a carta de apresentação e a análise de
        compatibilidade com o seu currículo.
      </p>

      {!hasResume && (
        <div className="mt-5 flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Você precisa de um currículo base para a IA gerar a análise.</span>
          <Link to="/onboarding" className="font-semibold underline underline-offset-2">
            Adicionar currículo
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6 sm:p-8">
        <div>
          <label htmlFor="job" className="label">
            Descrição da vaga <span className="text-red-500">*</span>
          </label>
          <textarea
            id="job"
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={12}
            className="input resize-y text-sm leading-relaxed"
            placeholder="Cole aqui a descrição completa da vaga (responsabilidades, requisitos, etc.)"
          />
          <p className="mt-1.5 text-xs text-slate-400">{jobDescription.trim().length} caracteres</p>
        </div>

        <div>
          <label htmlFor="company" className="label">
            Nome da empresa <span className="text-slate-400">(opcional)</span>
          </label>
          <input
            id="company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="input"
            placeholder="Ex.: Nubank"
          />
        </div>

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          <button type="submit" disabled={busy} className="btn-primary sm:min-w-40">
            {status === 'generating' ? (
              <Spinner label="Gerando com IA..." />
            ) : status === 'saving' ? (
              <Spinner label="Salvando..." />
            ) : (
              'Gerar'
            )}
          </button>
          <Link to="/dashboard" className="btn-secondary text-center">
            Cancelar
          </Link>
        </div>

        {status === 'generating' && (
          <p className="text-center text-xs text-slate-400">
            Analisando a vaga e o seu currículo — isso leva alguns segundos.
          </p>
        )}
      </form>
    </div>
  )
}
