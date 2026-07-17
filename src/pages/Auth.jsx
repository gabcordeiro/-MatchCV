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

  const isSignup = mode === 'signup'

  // Requisitos mínimos de senha (aplicados só no cadastro).
  const passwordChecks = [
    { label: 'Pelo menos 8 caracteres', ok: password.length >= 8 },
    { label: 'Uma letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: 'Uma letra minúscula', ok: /[a-z]/.test(password) },
    { label: 'Um símbolo (!@#$%…)', ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const passedCount = passwordChecks.filter((c) => c.ok).length
  const passwordOk = passedCount === passwordChecks.length

  function switchMode(next) {
    setMode(next)
    setError(null)
    setNotice(null)
    setConfirmEmail('')
    setConfirmPassword('')
  }

  async function handleOAuth(provider) {
    setError(null)
    setNotice(null)
    if (!isSupabaseConfigured) {
      setError('Supabase ainda não foi configurado. Veja o README para conectar seu projeto.')
      return
    }
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (oauthError) setError(translateAuthError(oauthError.message))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    if (!isSupabaseConfigured) {
      setError('Supabase ainda não foi configurado. Veja o README para conectar seu projeto.')
      return
    }
    if (isSignup) {
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setError('Os emails não coincidem.')
        return
      }
      if (!passwordOk) {
        setError('Sua senha ainda não atende aos requisitos abaixo do campo.')
        return
      }
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.')
        return
      }
    }

    setSubmitting(true)
    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError

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

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm animate-fadein">
        <div className="mb-6 flex justify-center">
          <Logo to="/" />
        </div>

        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900">
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

          {/* Login social */}
          <div className="mt-6 grid gap-2">
            <button
              type="button"
              onClick={() => handleOAuth('google')}
              className="btn-secondary w-full"
            >
              <GoogleIcon />
              Continuar com Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuth('linkedin_oidc')}
              className="btn-secondary w-full"
            >
              <LinkedinIcon />
              Continuar com LinkedIn
            </button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            ou com email
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder={isSignup ? 'Crie uma senha forte' : 'Sua senha'}
              />

              {/* Medidor + checklist de força (só no cadastro) */}
              {isSignup && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    {passwordChecks.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          i < passedCount
                            ? passedCount === passwordChecks.length
                              ? 'bg-olive-500'
                              : 'bg-amber-400'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                    {passwordChecks.map((c) => (
                      <li
                        key={c.label}
                        className={`flex items-center gap-1.5 text-[11px] transition-colors ${
                          c.ok ? 'text-olive-700' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`grid h-3.5 w-3.5 place-items-center rounded-full text-[9px] ${
                            c.ok ? 'bg-olive-100 text-olive-700' : 'bg-slate-100'
                          }`}
                        >
                          {c.ok ? '✓' : ''}
                        </span>
                        {c.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <p className="mt-1 text-[11px] text-amber-600">As senhas ainda não coincidem.</p>
                )}
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 01-2.39 3.62v3h3.87c2.26-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.14-4.06 1.14-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0012 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.28a7.2 7.2 0 010-4.56v-3.1H1.29a12 12 0 000 10.76l4-3.1z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 001.29 6.62l4 3.1C6.23 6.88 8.88 4.77 12 4.77z"
      />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="#0A66C2" aria-hidden="true">
      <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 110-4.12 2.06 2.06 0 010 4.12zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

function translateAuthError(message = '') {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email ou senha incorretos.'
  if (m.includes('user already registered')) return 'Este email já está cadastrado. Faça login.'
  if (m.includes('email not confirmed')) return 'Confirme seu email antes de entrar.'
  if (m.includes('provider is not enabled'))
    return 'Este login social ainda não foi habilitado no servidor (Supabase → Authentication → Providers).'
  return message || 'Algo deu errado. Tente novamente.'
}
