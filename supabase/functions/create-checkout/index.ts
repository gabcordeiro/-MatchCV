// Supabase Edge Function: create-checkout (Stripe-ready)
//
// Cria uma sessão de Checkout do Stripe para assinar o plano Pro.
// AINDA NÃO ATIVADA — para ativar, veja a seção "Pagamentos (Stripe)" no README:
//   1. Crie a conta/produto no Stripe e pegue o Price ID.
//   2. Secrets: STRIPE_SECRET_KEY, STRIPE_PRICE_ID, APP_URL.
//   3. Deploy desta função (verify_jwt desligado; a auth é validada aqui dentro).
// Enquanto os secrets não existem, responde 503 e o app mostra "em breve".

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function stripePost(path: string, key: string, params: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message ?? `Stripe ${res.status}`)
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const priceId = Deno.env.get('STRIPE_PRICE_ID')
    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || ''
    if (!stripeKey || !priceId) {
      return json({ error: 'Pagamentos ainda não estão ativados. Em breve!' }, 503)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return json({ error: 'Sessão inválida.' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Reusa (ou cria) o customer do Stripe para este usuário.
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.plan === 'pro') {
      return json({ error: 'Você já é assinante Pro. 🎉' }, 400)
    }

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripePost(
        'customers',
        stripeKey,
        new URLSearchParams({
          email: user.email ?? '',
          'metadata[user_id]': user.id,
        }),
      )
      customerId = customer.id
      await admin.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const session = await stripePost(
      'checkout/sessions',
      stripeKey,
      new URLSearchParams({
        mode: 'subscription',
        customer: customerId!,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: `${appUrl}/dashboard?checkout=success`,
        cancel_url: `${appUrl}/dashboard/upgrade?checkout=cancelled`,
        client_reference_id: user.id,
        'subscription_data[metadata][user_id]': user.id,
      }),
    )

    return json({ url: session.url })
  } catch (err) {
    console.error(err)
    return json({ error: 'Não foi possível iniciar o pagamento. Tente novamente.' }, 502)
  }
})
