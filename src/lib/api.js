import { supabase } from './supabaseClient.js'

// Invoca a Edge Function que gera a carta + análise via IA.
// Retorna { data } em caso de sucesso ou { error } com mensagem amigável.
export async function generateApplication(applicationId) {
  const { data, error } = await supabase.functions.invoke('generate-application', {
    body: { application_id: applicationId },
  })

  if (error) {
    // Para respostas não-2xx, o corpo JSON com a mensagem vem em error.context.
    let message = error.message || 'Falha ao gerar a aplicação.'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      /* mantém a mensagem padrão */
    }
    return { error: message }
  }

  return { data }
}

// Ações administrativas (set_plan, set_active, add_credits) — só admins.
export async function adminAction(payload) {
  const { data, error } = await supabase.functions.invoke('admin-actions', {
    body: payload,
  })
  if (error) {
    let message = error.message || 'Ação falhou.'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      /* mantém a mensagem padrão */
    }
    return { error: message }
  }
  return { data }
}

// Inicia o checkout do Mercado Pago: product = 'pro' (assinatura) | 'credits' (avulso/Pix).
// Enquanto os pagamentos não estiverem ativados, retorna um aviso amigável.
export async function createCheckout(product = 'pro') {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { product },
  })

  if (error) {
    let message = 'Pagamentos ainda não estão ativados. Em breve!'
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch {
      /* mantém a mensagem padrão */
    }
    return { error: message }
  }

  return { data }
}

// Otimiza headline + "Sobre" do LinkedIn para um cargo-alvo (recurso Pro).
// Retorna { data: { headlines, about, skills_to_add } } ou { error, code }.
export async function optimizeLinkedin({ headline, about, targetRole }) {
  const { data, error } = await supabase.functions.invoke('optimize-linkedin', {
    body: { headline, about, target_role: targetRole },
  })
  if (error) {
    let message = error.message || 'Falha ao otimizar o perfil.'
    let code = null
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
      if (body?.code) code = body.code
    } catch {
      /* mantém a mensagem padrão */
    }
    return { error: message, code }
  }
  return { data }
}
