// Supabase Edge Function: optimize-linkedin (Groq)
//
// Recurso exclusivo do plano Pro: otimiza headline + seção "Sobre" do LinkedIn
// para um cargo-alvo. Não persiste nada — o resultado é devolvido direto ao
// cliente. A chave (GROQ_API_KEY) fica APENAS aqui no servidor.
//
// (Resgatada para o repositório: estava deployada em produção sem estar
// versionada aqui. A UI correspondente vive em src/pages/Profile.jsx.)

import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'llama-3.3-70b-versatile'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_TOKENS = 1200
const MAX_INPUT_CHARS = 4000

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

const SYSTEM_PROMPT = `Você é um especialista em otimização de perfis do LinkedIn para o mercado brasileiro.

A partir do HEADLINE atual, da seção SOBRE atual e do CARGO-ALVO de um profissional, você deve:
1. Escrever 3 opções de headline (título abaixo do nome), cada uma com no máximo 220 caracteres, orientadas a palavras-chave que recrutadores buscam para o cargo-alvo — sem emojis excessivos, sem clichês como "apaixonado por resultados".
2. Reescrever a seção Sobre em português, tom profissional e humano (não corporativo genérico), destacando conquistas mensuráveis quando possível, com 3 a 5 parágrafos curtos. Baseie-se SOMENTE no que já está no texto original — não invente experiências, empresas ou números que não estejam lá.
3. Listar de 5 a 8 competências (skills) que valem a pena adicionar ao perfil para esse cargo-alvo, que fazem sentido dado o histórico da pessoa.

Responda SOMENTE com um objeto JSON válido, exatamente neste formato:
{"headlines": ["...", "...", "..."], "about": "texto da nova seção sobre", "skills_to_add": ["...", "..."]}`

function parseModelJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try { return JSON.parse(cleaned) } catch {
    const m = cleaned.match(/\{[\s\S]*\}/)
    if (m) return JSON.parse(m[0])
    throw new Error('Não foi possível interpretar a resposta da IA.')
  }
}

function normalizeResult(raw: any) {
  const arr = (v: unknown) => Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []
  return {
    headlines: arr(raw?.headlines).slice(0, 3),
    about: typeof raw?.about === 'string' ? raw.about.trim() : '',
    skills_to_add: arr(raw?.skills_to_add).slice(0, 8),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return json({ error: 'GROQ_API_KEY não configurada no servidor.' }, 500)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

    const { headline, about, target_role } = await req.json().catch(() => ({}))
    const currentHeadline = String(headline ?? '').trim().slice(0, MAX_INPUT_CHARS)
    const currentAbout = String(about ?? '').trim().slice(0, MAX_INPUT_CHARS)
    const targetRole = String(target_role ?? '').trim().slice(0, 200)

    if (!currentAbout && !currentHeadline) {
      return json({ error: 'Cole ao menos o headline ou a seção Sobre atual.' }, 400)
    }
    if (!targetRole) return json({ error: 'Informe o cargo-alvo.' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return json({ error: 'Sessão inválida.' }, 401)

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_active === false) {
      return json({ error: 'Esta conta está desativada. Fale com o suporte.' }, 403)
    }
    if (profile?.plan !== 'pro') {
      return json(
        { error: 'Otimização de LinkedIn é exclusiva do plano Pro.', code: 'pro_required' },
        402,
      )
    }

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.6,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content:
              `CARGO-ALVO: ${targetRole}\n\n` +
              `HEADLINE ATUAL:\n${currentHeadline || '(vazio)'}\n\n` +
              `SOBRE ATUAL:\n${currentAbout || '(vazio)'}`,
          },
        ],
      }),
    })

    if (!groqRes.ok) {
      const detail = await groqRes.text()
      console.error('Groq error', groqRes.status, detail)
      if (groqRes.status === 429) {
        return json({ error: 'Limite gratuito da IA atingido no momento. Aguarde cerca de 1 minuto e tente novamente.' }, 429)
      }
      return json({ error: 'Falha ao gerar com a IA. Tente novamente.' }, 502)
    }

    const payload = await groqRes.json()
    const text = payload?.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) return json({ error: 'A IA não retornou resposta. Tente novamente.' }, 502)

    const result = normalizeResult(parseModelJson(text))
    if (!result.about && result.headlines.length === 0) {
      return json({ error: 'A IA não retornou um resultado válido.' }, 502)
    }

    return json(result)
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro inesperado ao otimizar o perfil.' }, 500)
  }
})
