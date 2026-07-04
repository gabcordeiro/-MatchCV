// Supabase Edge Function: customer-portal (Stripe-ready)
//
// Abre o Customer Portal do Stripe para o usuário gerenciar cartão e assinatura.
// NUNCA armazenamos dados de cartão — isso é 100% do Stripe (PCI-DSS).
//
// Secrets: STRIPE_SECRET_KEY, APP_URL.
// No painel do Stripe: Settings → Billing → Customer portal → ativar.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const appUrl = Deno.env.get('APP_URL') || req.headers.get('origin') || ''
    if (!stripeKey) {
      return json({ error: 'Pagamentos ainda não estão ativados. Em breve!' }, 503)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return json({ error: 'Sessão inválida.' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile?.stripe_customer_id) {
      return json(
        { error: 'Você ainda não tem pagamentos registrados. Assine ou compre créditos primeiro.' },
        400,
      )
    }

    const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: profile.stripe_customer_id,
        return_url: `${appUrl}/dashboard/profile`,
      }),
    })
    const session = await res.json()
    if (!res.ok) {
      console.error('Stripe portal error', session)
      return json({ error: 'Não foi possível abrir o portal de pagamento.' }, 502)
    }

    return json({ url: session.url })
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro inesperado.' }, 500)
  }
})
