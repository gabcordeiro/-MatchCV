import { useState } from 'react'
import PublicShell from '../components/PublicShell.jsx'
import Spinner from '../components/Spinner.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { useAuth } from '../context/AuthContext.jsx'
import { SITE, whatsappLink } from '../lib/site.js'

export default function Contact() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState(null)

  const wa = whatsappLink('Olá! Vim pelo site do MatchCV e queria falar com vocês.')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setStatus('sending')
    setError(null)
    const { error: insertError } = await supabase.from('contact_messages').insert({
      name: name.trim() || null,
      email: email.trim() || null,
      message: message.trim(),
      user_id: user?.id ?? null,
    })
    if (insertError) {
      setStatus('error')
      setError('Não foi possível enviar agora. Tente o WhatsApp ou o e-mail abaixo.')
      return
    }
    setStatus('sent')
    setMessage('')
  }

  return (
    <PublicShell>
      <h1 className="text-3xl font-semibold text-slate-900">Fale com a gente</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Dúvida, problema com pagamento, sugestão ou só um oi? A gente responde. Escolha o canal
        que preferir.
      </p>

      {/* Canais diretos */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="card flex items-center gap-3 p-4 transition-colors hover:border-olive-300"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-olive-100 text-olive-700">
              <WhatsAppIcon />
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-900">WhatsApp</span>
              <span className="block text-xs text-slate-500">
                {SITE.whatsappDisplay || 'Resposta rápida no horário comercial'}
              </span>
            </span>
          </a>
        )}
        <a
          href={`mailto:${SITE.supportEmail}`}
          className="card flex items-center gap-3 p-4 transition-colors hover:border-brand-300"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <MailIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-slate-900">E-mail</span>
            <span className="block truncate text-xs text-slate-500">{SITE.supportEmail}</span>
          </span>
        </a>
      </div>

      {/* Formulário */}
      <form onSubmit={handleSubmit} className="card mt-4 flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Ou mande uma mensagem</h2>

        {status === 'sent' ? (
          <div className="rounded-xl bg-olive-50 px-4 py-3 text-sm text-olive-800">
            ✓ Mensagem enviada! A gente responde no e-mail que você informou. Obrigado.
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="label">
                  Nome
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  placeholder="Como te chamamos"
                  maxLength={120}
                />
              </div>
              <div>
                <label htmlFor="email" className="label">
                  Seu e-mail
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="voce@email.com"
                  maxLength={200}
                />
              </div>
            </div>
            <div>
              <label htmlFor="message" className="label">
                Mensagem
              </label>
              <textarea
                id="message"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                maxLength={4000}
                className="input resize-y"
                placeholder="Conta pra gente o que você precisa…"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={status === 'sending'}
              className="btn-primary self-start"
            >
              {status === 'sending' ? <Spinner label="Enviando..." /> : 'Enviar mensagem'}
            </button>
          </>
        )}
      </form>
    </PublicShell>
  )
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 18.15h-.01a8.2 8.2 0 01-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.23 8.23 0 01-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 012.41 5.83c0 4.54-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.42l-.48-.01c-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.57.12.16 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  )
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
