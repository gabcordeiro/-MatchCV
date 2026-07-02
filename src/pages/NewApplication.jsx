import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import Spinner from '../components/Spinner.jsx'

export default function NewApplication() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [jobDescription, setJobDescription] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!jobDescription.trim()) {
      setError('Cole a descrição da vaga para continuar.')
      return
    }

    setSaving(true)
    // For now we only persist the application. IA generation (carta + análise)
    // will be wired up in the next step.
    const { error: err } = await supabase.from('applications').insert({
      user_id: user.id,
      company_name: companyName.trim() || null,
      job_description: jobDescription.trim(),
      status: 'draft',
    })
    setSaving(false)

    if (err) {
      setError(err.message)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar para o dashboard
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Nova aplicação</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cole a descrição da vaga. Na próxima etapa a IA vai gerar a carta e a análise de
        compatibilidade.
      </p>

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
          <button type="submit" disabled={saving} className="btn-primary sm:min-w-32">
            {saving ? <Spinner label="Salvando..." /> : 'Gerar'}
          </button>
          <Link to="/dashboard" className="btn-secondary text-center">
            Cancelar
          </Link>
        </div>

        <p className="text-center text-xs text-slate-400">
          A geração da carta e da análise por IA será ativada na próxima etapa.
        </p>
      </form>
    </div>
  )
}
