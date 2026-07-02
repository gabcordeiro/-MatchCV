import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import Logo from '../components/Logo.jsx'
import Spinner from '../components/Spinner.jsx'

export default function Auth() {
  const navigate = useNavigate()
  const { session } = useAuth()

  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  // Already logged in? Skip the auth screen.
  useEffect(() => {
    if (session) navigate('/dashboard', { replace: true })
  }, [session, navigate])

  function switchMode(next) {
    setMode(next)
    setError(null)
    setNotice(null)
    setConfirmEmail('')
    setConfirmPassword('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!isSupabaseConfigured) {
      setError('Supabase ainda não foi configurado. Veja o README para conectar seu projeto.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (mode === 'signup') {
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setError('Os emails não coincidem.')
        return
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }
    }

    setSubmitting(true)
    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError

        // If email confirmation is disabled, we get a session immediately and
        // can send the user straight to onboarding.
        if (data.session) {
          navigate('/onboarding', { replace: true })
        } else {
          setNotice(
            'Cadastro criado! Confirme seu email pelo link que enviamos e depois faça login.',
          )
          setMode('signin')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        navigate('/dashboard', { replace: true })
      }
    } catch (err) {
      setError(translateAuthError(err?.message))
    } finally {
      setSubmitting(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo to="/" />
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900">
            {isSignup ? 'Criar conta grátis' : 'Entrar na sua conta'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup
              ? 'Comece a gerar cartas e análises em minutos.'
              : 'Bem-vindo de volta ao MatchCV.'}
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
              Supabase não configurado. Defina <code>VITE_SUPABASE_URL</code> e{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> no arquivo <code>.env</code>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="voce@email.com"
              />
            </div>

            {isSignup && (
              <div>
                <label htmlFor="confirmEmail" className="label">
                  Confirmar email
                </label>
                <input
                  id="confirmEmail"
                  type="email"
                  autoComplete="off"
                  required
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  onPaste={(e) => e.preventDefault()}
                  className="input"
                  placeholder="Repita seu email"
                />
              </div>
            )}

            <div>
              <label htmlFor="password" className="label">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {isSignup && (
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Repita sua senha"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            {notice && (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">{notice}</p>
            )}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? (
                <Spinner label={isSignup ? 'Criando...' : 'Entrando...'} />
              ) : isSignup ? (
                'Criar conta'
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isSignup ? 'Já tem uma conta?' : 'Ainda não tem conta?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(isSignup ? 'signin' : 'signup')}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              {isSignup ? 'Entrar' : 'Cadastre-se'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="hover:text-slate-700">
            ← Voltar para o início
          </Link>
        </p>
      </div>
    </div>
  )
}

function translateAuthError(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email ou senha incorretos.'
  if (m.includes('user already registered')) return 'Este email já está cadastrado. Faça login.'
  if (m.includes('email not confirmed')) return 'Confirme seu email antes de entrar.'
  return message || 'Algo deu errado. Tente novamente.'
}
