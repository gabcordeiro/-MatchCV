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

// Inicia o checkout do Stripe para assinar o plano Pro.
// Enquanto os pagamentos não estiverem ativados, retorna um aviso amigável.
export async function createCheckout() {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {},
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
