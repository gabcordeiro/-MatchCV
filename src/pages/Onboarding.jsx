import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext.jsx'
import { FullPageSpinner } from '../components/Spinner.jsx'
import Spinner from '../components/Spinner.jsx'
import Logo from '../components/Logo.jsx'
import AvatarUpload from '../components/AvatarUpload.jsx'

export default function Onboarding() {
  const navigate = useNavigate()
  const { profile, loading, updateProfile } = useProfile()

  const [resume, setResume] = useState('')
  const [saving, setSaving] = useState('') // '' | 'save' | 'skip'
  const [error, setError] = useState(null)

  // If the user already finished onboarding, don't show it again.
  useEffect(() => {
    if (!loading && profile?.onboarded) {
      navigate('/dashboard', { replace: true })
    }
  }, [loading, profile, navigate])

  // Pre-fill if a resume was already saved (e.g. returning to edit).
  useEffect(() => {
    if (profile?.base_resume) setResume(profile.base_resume)
  }, [profile?.base_resume])

  if (loading) return <FullPageSpinner />

  async function handleSave() {
    setError(null)
    if (!resume.trim()) {
      setError('Cole o texto do seu currículo ou use "Pular por agora".')
      return
    }
    setSaving('save')
    const { error: err } = await updateProfile({ base_resume: resume.trim(), onboarded: true })
    setSaving('')
    if (err) {
      setError(err)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  async function handleSkip() {
    setError(null)
    setSaving('skip')
    const { error: err } = await updateProfile({ onboarded: true })
    setSaving('')
    if (err) {
      setError(err)
      return
    }
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex justify-center">
          <Logo to={null} />
        </div>

        <div className="card p-6 sm:p-8">
          <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
            Primeiro acesso
          </span>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Cole seu currículo base</h1>
          <p className="mt-2 text-sm text-slate-600">
            Vamos usar esse texto como base para gerar cartas de apresentação e analisar a
            compatibilidade com cada vaga. Você pode editar isso depois.
          </p>

          <div className="mt-6">
            <span className="label">Foto de perfil (opcional)</span>
            <AvatarUpload />
          </div>

          <div className="mt-6">
            <label htmlFor="resume" className="label">
              Seu currículo (texto)
            </label>
            <textarea
              id="resume"
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={14}
              className="input resize-y font-mono text-[13px] leading-relaxed"
              placeholder={
                'Cole aqui seu currículo completo em texto — experiências, formação, habilidades, etc.'
              }
            />
            <p className="mt-1.5 text-xs text-slate-400">{resume.trim().length} caracteres</p>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <button onClick={handleSave} disabled={!!saving} className="btn-primary sm:min-w-40">
              {saving === 'save' ? <Spinner label="Salvando..." /> : 'Salvar e continuar'}
            </button>
            <button onClick={handleSkip} disabled={!!saving} className="btn-secondary">
              {saving === 'skip' ? <Spinner label="Aguarde..." /> : 'Pular por agora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
