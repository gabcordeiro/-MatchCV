// Supabase Edge Function: generate-application
//
// Recebe { application_id }, busca o currículo base do perfil e a descrição da
// vaga (respeitando RLS via JWT do usuário), chama a API da Anthropic (Claude)
// para gerar a carta de apresentação + análise de compatibilidade, e salva o
// resultado na tabela `applications`.
//
// A chave da Anthropic (ANTHROPIC_API_KEY) fica APENAS aqui no servidor —
// nunca no frontend. Configure com:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Deploy:
//   supabase functions deploy generate-application

import { createClient } from 'npm:@supabase/supabase-js@2'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1500

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const SYSTEM_PROMPT = `Você é um assistente especialista em recrutamento e carreira, escrevendo em português do Brasil.

A partir do CURRÍCULO de um candidato e da DESCRIÇÃO DE UMA VAGA, você deve:
1. Escrever uma carta de apresentação personalizada, com tom profissional e caloroso, em português. Foque nos pontos do currículo que MAIS combinam com a vaga. Seja específico e evite clichês genéricos. Não invente experiências que não estão no currículo.
2. Identificar as palavras-chave e competências mais importantes da vaga que ESTÃO presentes no currículo (keywords_present).
3. Identificar as palavras-chave e competências importantes da vaga que NÃO estão no currículo (keywords_missing), para o candidato saber o que destacar ou desenvolver.
4. Calcular um match_score de 0 a 100 representando a compatibilidade geral do currículo com a vaga.

Responda ESTRITAMENTE com um único objeto JSON válido, sem markdown, sem cercas de código, sem texto antes ou depois, exatamente neste formato:
{"cover_letter": "texto da carta", "keywords_present": ["..."], "keywords_missing": ["..."], "match_score": 0}`

// Extrai o JSON da resposta do modelo, tolerando cercas de código eventuais.
function parseModelJson(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Não foi possível interpretar a resposta da IA.')
  }
}

function normalizeResult(raw: any) {
  const toStringArray = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : []
  let score = Number(raw?.match_score)
  if (!Number.isFinite(score)) score = 0
  score = Math.max(0, Math.min(100, Math.round(score)))
  return {
    cover_letter: typeof raw?.cover_letter === 'string' ? raw.cover_letter.trim() : '',
    keywords_present: toStringArray(raw?.keywords_present),
    keywords_missing: toStringArray(raw?.keywords_missing),
    match_score: score,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido.' }, 405)
  }

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return json({ error: 'ANTHROPIC_API_KEY não configurada no servidor.' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Não autenticado.' }, 401)
    }

    const { application_id } = await req.json().catch(() => ({}))
    if (!application_id) {
      return json({ error: 'application_id é obrigatório.' }, 400)
    }

    // Client com o JWT do usuário → RLS garante que ele só acessa os próprios dados.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Sessão inválida.' }, 401)
    }

    // Busca a aplicação (RLS: só a do próprio usuário).
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('id, job_description')
      .eq('id', application_id)
      .single()

    if (appError || !application) {
      return json({ error: 'Aplicação não encontrada.' }, 404)
    }
    if (!application.job_description?.trim()) {
      return json({ error: 'A descrição da vaga está vazia.' }, 400)
    }

    // Busca o currículo base do perfil.
    const { data: profile } = await supabase
      .from('profiles')
      .select('base_resume')
      .eq('id', user.id)
      .maybeSingle()

    const baseResume = profile?.base_resume?.trim()
    if (!baseResume) {
      return json(
        { error: 'Adicione seu currículo base no perfil antes de gerar.' },
        400,
      )
    }

    // Chamada à Anthropic. Raw HTTP mantém a função leve no runtime Deno.
    // claude-sonnet-4-6 não suporta structured outputs nem prefill de assistant,
    // então pedimos JSON estrito no prompt e fazemos o parse da resposta.
    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content:
              `CURRÍCULO DO CANDIDATO:\n${baseResume}\n\n` +
              `DESCRIÇÃO DA VAGA:\n${application.job_description.trim()}`,
          },
        ],
      }),
    })

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text()
      console.error('Anthropic error', anthropicRes.status, detail)
      return json({ error: 'Falha ao gerar com a IA. Tente novamente.' }, 502)
    }

    const payload = await anthropicRes.json()
    if (payload.stop_reason === 'refusal') {
      return json({ error: 'A IA não pôde processar este conteúdo.' }, 422)
    }

    const text = (payload.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('')

    const result = normalizeResult(parseModelJson(text))
    if (!result.cover_letter) {
      return json({ error: 'A IA não retornou uma carta válida.' }, 502)
    }

    const match_analysis = {
      match_score: result.match_score,
      keywords_present: result.keywords_present,
      keywords_missing: result.keywords_missing,
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update({
        generated_letter: result.cover_letter,
        match_analysis,
        status: 'completed',
      })
      .eq('id', application_id)

    if (updateError) {
      return json({ error: 'Não foi possível salvar o resultado.' }, 500)
    }

    return json({
      generated_letter: result.cover_letter,
      match_analysis,
      status: 'completed',
    })
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro inesperado ao gerar a aplicação.' }, 500)
  }
})
