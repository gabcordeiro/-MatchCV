// Supabase Edge Function: mercadopago-webhook
//
// Recebe notificações do Mercado Pago e credita/ativa o plano do usuário.
// AINDA NÃO ATIVADA — para ativar, veja "Pagamentos (Mercado Pago)" no README:
//   1. Secret: MP_WEBHOOK_SECRET (gerado ao registrar a URL de notificação no
//      painel do Mercado Pago → Suas integrações → Webhooks).
//   2. Deploy com verify_jwt DESLIGADO (o Mercado Pago não envia JWT; a segurança
//      é a assinatura HMAC verificada abaixo).
//   3. No painel do Mercado Pago, registre a URL:
//      https://<PROJECT_REF>.supabase.co/functions/v1/mercadopago-webhook
//      com os eventos "Pagamentos" e "Assinaturas".
//
// Recibo por e-mail (opcional): se os secrets RESEND_API_KEY e RESEND_FROM
// existirem, o pagamento confirmado dispara um e-mail de confirmação. Sem eles,
// nada muda — o envio é simplesmente pulado.
//
// Idempotência: cada notificação tem um `id` próprio (distinto do `data.id` do
// recurso). Guardamos em `payment_webhook_events` e ignoramos duplicata/retry
// ANTES de aplicar qualquer efeito.

import { createClient } from 'npm:@supabase/supabase-js@2'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// Verificação da assinatura do Mercado Pago: HMAC SHA-256 do manifest
// `id:{data.id};request-id:{x-request-id};ts:{ts};`, usando o secret do webhook.
async function verifySignature(
  dataId: string,
  requestId: string,
  signatureHeader: string,
  secret: string,
) {
  const parts: Record<string, string> = {}
  for (const piece of signatureHeader.split(',')) {
    const [k, v] = piece.split('=')
    if (k && v) parts[k.trim()] = v.trim()
  }
  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(manifest))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === v1
}

async function mpGet(path: string, token: string) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Mercado Pago GET ${path} → ${res.status}`)
  return res.json()
}

// Envia o recibo por e-mail via Resend. No-op se os secrets não existirem ou
// se não houver e-mail do usuário. Nunca lança — falha de e-mail não pode
// derrubar o processamento do pagamento.
async function sendReceipt(
  email: string | null | undefined,
  opts: { kind: 'credits' | 'subscription'; amountCents: number | null; credits: number },
) {
  try {
    const apiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('RESEND_FROM')
    const appUrl = Deno.env.get('APP_URL') || 'https://match-cv-nine.vercel.app'
    if (!apiKey || !from || !email) return

    const amount =
      typeof opts.amountCents === 'number'
        ? (opts.amountCents / 100).toFixed(2).replace('.', ',')
        : null

    const isCredits = opts.kind === 'credits'
    const subject = isCredits
      ? 'Pagamento confirmado no MatchCV 🎉'
      : 'Bem-vindo ao MatchCV Pro ⚡'
    const lead = isCredits
      ? `Recebemos seu pagamento${amount ? ` de R$ ${amount}` : ''} e liberamos ${opts.credits} ${
          opts.credits === 1 ? 'crédito' : 'créditos'
        } na sua conta.`
      : `Sua assinatura Pro${amount ? ` de R$ ${amount}/mês` : ''} está ativa. Agora é análise ilimitada e preparação de entrevista liberadas.`

    const html = `<!doctype html><html><body style="margin:0;background:#FAF7F2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#241F1A">
      <div style="max-width:520px;margin:0 auto;padding:32px 24px">
        <div style="font-size:22px;font-weight:700">Match<span style="color:#B84E24">CV</span></div>
        <div style="height:4px;width:48px;background:#B84E24;border-radius:9px;margin:16px 0 24px"></div>
        <h1 style="font-size:22px;margin:0 0 12px">Pagamento confirmado 🎉</h1>
        <p style="font-size:15px;line-height:1.6;color:#50463A;margin:0 0 20px">${lead}</p>
        <a href="${appUrl}/dashboard" style="display:inline-block;background:#B84E24;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">Ir para o meu painel</a>
        <p style="font-size:13px;line-height:1.6;color:#867A66;margin:28px 0 0">Este é um recibo automático do MatchCV. Guarde-o para seus registros. Precisa de ajuda? É só responder este e-mail.</p>
      </div>
    </body></html>`

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: email, subject, html }),
    })
  } catch (err) {
    console.error('sendReceipt failed (ignorado)', err)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const webhookSecret = Deno.env.get('MP_WEBHOOK_SECRET')
  const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
  if (!webhookSecret || !accessToken) return json({ error: 'Webhook não configurado.' }, 503)

  const url = new URL(req.url)
  const payload = await req.text()
  const body = JSON.parse(payload || '{}')

  // O data.id que foi assinado vem da query string da URL de notificação
  // (o Mercado Pago anexa ?data.id=...&type=... na chamada); o corpo é fallback.
  const dataId = url.searchParams.get('data.id') || body?.data?.id
  const type = url.searchParams.get('type') || body?.type
  const requestId = req.headers.get('x-request-id') ?? ''
  const signatureHeader = req.headers.get('x-signature') ?? ''

  if (!dataId || !(await verifySignature(String(dataId), requestId, signatureHeader, webhookSecret))) {
    return json({ error: 'Assinatura inválida.' }, 400)
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Idempotência: insere a notificação (id próprio, não o data.id) ANTES de agir.
  // Se colidir, já processamos essa notificação exata — ignora.
  const notificationId = String(body?.id ?? `${type}:${dataId}`)
  const { error: dupeError } = await admin
    .from('payment_webhook_events')
    .insert({ id: notificationId, type })
  if (dupeError) return json({ received: true, duplicate: true })

  try {
    if (type === 'payment') {
      const mpPayment = await mpGet(`/v1/payments/${dataId}`, accessToken)
      const paymentId = mpPayment.external_reference
      if (!paymentId) return json({ received: true })

      const { data: payment } = await admin
        .from('payments')
        .select('id, user_id, kind, credits, amount_cents, status')
        .eq('id', paymentId)
        .maybeSingle()
      if (!payment || payment.status === 'paid') return json({ received: true })

      if (mpPayment.status === 'approved') {
        await admin
          .from('payments')
          .update({ status: 'paid', paid_at: new Date().toISOString(), provider_payment_id: String(dataId) })
          .eq('id', payment.id)

        if (payment.kind === 'credits') {
          const { data: target } = await admin
            .from('profiles')
            .select('credits, email')
            .eq('id', payment.user_id)
            .maybeSingle()
          await admin
            .from('profiles')
            .update({ credits: (target?.credits ?? 0) + payment.credits })
            .eq('id', payment.user_id)
          await sendReceipt(target?.email, {
            kind: 'credits',
            amountCents: payment.amount_cents,
            credits: payment.credits,
          })
        }
      } else if (['rejected', 'cancelled'].includes(mpPayment.status)) {
        await admin.from('payments').update({ status: 'failed' }).eq('id', payment.id)
      }
    } else if (type === 'subscription_preapproval') {
      const preapproval = await mpGet(`/preapproval/${dataId}`, accessToken)
      const paymentId = preapproval.external_reference

      if (preapproval.status === 'authorized') {
        const { data: payment } = await admin
          .from('payments')
          .select('id, user_id, amount_cents, status')
          .eq('id', paymentId)
          .maybeSingle()
        if (payment && payment.status !== 'paid') {
          await admin
            .from('payments')
            .update({ status: 'paid', paid_at: new Date().toISOString(), provider_payment_id: String(dataId) })
            .eq('id', payment.id)
          const { data: target } = await admin
            .from('profiles')
            .update({ plan: 'pro', mercadopago_subscription_id: String(dataId) })
            .eq('id', payment.user_id)
            .select('email')
            .maybeSingle()
          await sendReceipt(target?.email, {
            kind: 'subscription',
            amountCents: payment.amount_cents,
            credits: 0,
          })
        }
      } else if (['cancelled', 'paused'].includes(preapproval.status)) {
        await admin
          .from('profiles')
          .update({ plan: 'free' })
          .eq('mercadopago_subscription_id', String(dataId))
      }
    }
    // 'subscription_authorized_payment' (cobrança recorrente mensal já autorizada):
    // não gera linha nova em `payments` no MVP — o plano já está 'pro' desde a
    // autorização inicial. Registrar cada renovação fica pra depois do sprint.
  } catch (err) {
    console.error('mercadopago-webhook handling failed', err)
    return json({ error: 'Falha ao processar a notificação.' }, 500)
  }

  return json({ received: true })
})
