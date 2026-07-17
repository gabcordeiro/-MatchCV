// Supabase Edge Function: create-checkout (Mercado Pago)
//
// Cria uma cobrança do Mercado Pago para DOIS produtos:
//   - product: 'pro'     → assinatura mensal recorrente (Preapproval — só cartão,
//                          Mercado Pago não tem Pix recorrente no Brasil)
//   - product: 'credits' → pacote de créditos avulsos (Preferência de Checkout Pro,
//                          cartão OU Pix, pagamento único)
//
// AINDA NÃO ATIVADA — veja "Pagamentos (Mercado Pago)" no README:
//   Secrets: MP_ACCESS_TOKEN, APP_URL.
// Enquanto o secret não existe, responde 503 e o app mostra "em breve".

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PRO_AMOUNT = Number(Deno.env.get('MP_PRO_AMOUNT') ?? '19.90')
const CREDITS_AMOUNT = Number(Deno.env.get('MP_CREDITS_AMOUNT') ?? '9.90')
const CREDITS_QTY = Number(Deno.env.get('MP_CREDITS_QTY') ?? '10')

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function mpPost(path: string, token: string, body: unknown) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message ?? `Mercado Pago ${res.status}`)
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const accessToken = Deno.env.get('MP_ACCESS_TOKEN')
    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    if (!accessToken) {
      return json({ error: 'Pagamentos ainda não estão ativados. Em breve!' }, 503)
    }

    const { product = 'pro' } = await req.json().catch(() => ({}))
    const isCredits = product === 'credits'

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

    const supabase = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return json({ error: 'Sessão inválida.' }, 401)

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: profile } = await admin
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .maybeSingle()

    if (!isCredits && profile?.plan === 'pro') {
      return json({ error: 'Você já é assinante Pro. 🎉' }, 400)
    }

    // Cria a linha em `payments` ANTES de chamar o Mercado Pago: o id dela vira o
    // external_reference que o webhook usa pra encontrar de volta este registro
    // (o Mercado Pago não devolve nenhum id nosso, só o dele).
    const { data: payment, error: paymentError } = await admin
      .from('payments')
      .insert({
        user_id: user.id,
        kind: isCredits ? 'credits' : 'subscription',
        amount_cents: Math.round((isCredits ? CREDITS_AMOUNT : PRO_AMOUNT) * 100),
        credits: isCredits ? CREDITS_QTY : 0,
      })
      .select('id')
      .single()
    if (paymentError || !payment) throw new Error('Não foi possível iniciar a cobrança.')

    // Se a chamada ao Mercado Pago falhar, apaga a linha pending órfã do ledger
    // e devolve o erro real do MP (ajuda a diagnosticar; ex.: preapproval em
    // modo teste exige payer_email de usuário de teste).
    async function failCleanly(err: unknown) {
      await admin.from('payments').delete().eq('id', payment.id)
      const detail = err instanceof Error ? err.message : ''
      console.error('Mercado Pago falhou:', detail)
      return json(
        {
          error: detail
            ? `O Mercado Pago recusou a operação: ${detail}`
            : 'Não foi possível iniciar o pagamento. Tente novamente.',
        },
        502,
      )
    }

    const notificationUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`

    if (isCredits) {
      let preference
      try {
        preference = await mpPost('/checkout/preferences', accessToken, {
          items: [
            {
              title: `Pacote de ${CREDITS_QTY} análises — MatchCV`,
              quantity: 1,
              unit_price: CREDITS_AMOUNT,
              currency_id: 'BRL',
            },
          ],
          payer: { email: user.email },
          external_reference: payment.id,
          back_urls: {
            success: `${appUrl}/dashboard?checkout=success`,
            failure: `${appUrl}/dashboard/upgrade?checkout=cancelled`,
            pending: `${appUrl}/dashboard?checkout=pending`,
          },
          auto_return: 'approved',
          notification_url: notificationUrl,
        })
      } catch (err) {
        return await failCleanly(err)
      }
      await admin.from('payments').update({ provider_reference: preference.id }).eq('id', payment.id)
      return json({ url: preference.init_point })
    }

    // Assinatura: Preapproval sem plano associado e sem cartão pré-tokenizado — o
    // usuário completa a autorização na página hospedada do Mercado Pago.
    // Atenção (modo teste): o MP exige que payer_email seja de um usuário de
    // teste; com credenciais de produção, o e-mail real do usuário funciona.
    let preapproval
    try {
      preapproval = await mpPost('/preapproval', accessToken, {
        reason: 'MatchCV Pro — assinatura mensal',
        external_reference: payment.id,
        payer_email: user.email,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: PRO_AMOUNT,
          currency_id: 'BRL',
        },
        back_url: `${appUrl}/dashboard?checkout=success`,
        notification_url: notificationUrl,
        status: 'pending',
      })
    } catch (err) {
      return await failCleanly(err)
    }
    await admin.from('payments').update({ provider_reference: preapproval.id }).eq('id', payment.id)

    return json({ url: preapproval.init_point })
  } catch (err) {
    console.error(err)
    return json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, 502)
  }
})
