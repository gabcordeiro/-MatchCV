// Supabase Edge Function: stripe-webhook (Stripe-ready)
//
// Recebe eventos do Stripe e atualiza o plano do usuário (pro/free).
// AINDA NÃO ATIVADA — para ativar, veja "Pagamentos (Stripe)" no README:
//   1. Secret: STRIPE_WEBHOOK_SECRET (whsec_..., gerado ao registrar o endpoint).
//   2. Deploy com verify_jwt DESLIGADO (o Stripe não envia JWT; a segurança é a
//      assinatura HMAC verificada abaixo).
//   3. No painel do Stripe → Webhooks, aponte para:
//      https://<PROJECT_REF>.supabase.co/functions/v1/stripe-webhook
//      com os eventos: checkout.session.completed,
//      customer.subscription.updated, customer.subscription.deleted.

import { createClient } from 'npm:@supabase/supabase-js@2'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Verificação manual da assinatura do Stripe (HMAC SHA-256 de `${t}.${payload}`).
async function verifyStripeSignature(payload: string, header: string, secret: string) {
  const parts: Record<string, string> = {}
  for (const piece of header.split(',')) {
    const [k, v] = piece.split('=')
    if (k && v && !(k in parts)) parts[k.trim()] = v.trim()
  }
  const t = parts['t']
  const v1 = parts['v1']
  if (!t || !v1) return false
  // Tolerância de 5 minutos contra replay.
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === v1
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!secret) return json({ error: 'Webhook não configurado.' }, 503)

  const signature = req.headers.get('stripe-signature') ?? ''
  const payload = await req.text()
  if (!(await verifyStripeSignature(payload, signature, secret))) {
    return json({ error: 'Assinatura inválida.' }, 400)
  }

  const event = JSON.parse(payload)
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const userId = session.client_reference_id || session.metadata?.user_id
        if (userId) {
          await admin
            .from('profiles')
            .update({
              plan: 'pro',
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription,
            })
            .eq('id', userId)
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const active = ['active', 'trialing'].includes(sub.status)
        await admin
          .from('profiles')
          .update({ plan: active ? 'pro' : 'free' })
          .eq('stripe_customer_id', sub.customer)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await admin
          .from('profiles')
          .update({ plan: 'free', stripe_subscription_id: null })
          .eq('stripe_customer_id', sub.customer)
        break
      }
    }
  } catch (err) {
    console.error('webhook handling failed', err)
    return json({ error: 'Falha ao processar o evento.' }, 500)
  }

  return json({ received: true })
})
