// Supabase Edge Function: admin-actions
//
// Ações administrativas sobre usuários (trocar plano, ativar/desativar conta,
// adicionar créditos). A escrita usa service role porque as colunas de
// plano/uso de `profiles` são protegidas por grants de coluna (migration 0003)
// — mas SÓ executa depois de confirmar que o chamador tem role = 'admin'.
//
// Body: { action: 'set_plan',   user_id, plan: 'free' | 'pro' }
//     | { action: 'set_active', user_id, is_active: boolean }
//     | { action: 'add_credits', user_id, amount: number }

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

    // Checagem de role NO SERVIDOR (nunca confiar no frontend).
    const { data: caller } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (caller?.role !== 'admin') {
      return json({ error: 'Acesso restrito a administradores.' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const { action, user_id } = body
    if (!action || !user_id) return json({ error: 'action e user_id são obrigatórios.' }, 400)

    if (action === 'set_plan') {
      if (!['free', 'pro'].includes(body.plan)) return json({ error: 'Plano inválido.' }, 400)
      const { error } = await admin.from('profiles').update({ plan: body.plan }).eq('id', user_id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'set_active') {
      const { error } = await admin
        .from('profiles')
        .update({ is_active: Boolean(body.is_active) })
        .eq('id', user_id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    if (action === 'add_credits') {
      const amount = Number(body.amount)
      if (!Number.isFinite(amount) || amount === 0) return json({ error: 'amount inválido.' }, 400)
      const { data: target } = await admin
        .from('profiles')
        .select('credits')
        .eq('id', user_id)
        .maybeSingle()
      const next = Math.max(0, (target?.credits ?? 0) + Math.round(amount))
      const { error } = await admin.from('profiles').update({ credits: next }).eq('id', user_id)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, credits: next })
    }

    return json({ error: 'Ação desconhecida.' }, 400)
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro inesperado.' }, 500)
  }
})
