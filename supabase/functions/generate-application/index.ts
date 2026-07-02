// Supabase Edge Function: generate-application
//
// Recebe { application_id }, busca o currículo base do perfil e a descrição da
// vaga (respeitando RLS via JWT do usuário), chama a API do Google Gemini para
// gerar a carta de apresentação + análise de compatibilidade, e salva o
// resultado na tabela `applications`.
//
// A chave do Gemini (GEMINI_API_KEY) fica APENAS aqui no servidor — nunca no
// frontend. Pegue uma chave grátis em https://aistudio.google.com/apikey e
// configure com:
//   supabase secrets set GEMINI_API_KEY=...
//
// Deploy:
//   supabase functions deploy generate-application

import { createClient } from 'npm:@supabase/supabase-js@2'

// gemini-2.0-flash está no tier gratuito e não gasta tokens "pensando".
// Alternativas: gemini-2.5-flash (mais forte) ou gemini-1.5-flash.
const MODEL = 'gemini-2.0-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
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
4. Calcular um match_score de 0 a 100 representando a compatibilidade geral do currículo com a vaga.`

// Schema que o Gemini deve seguir na resposta (força JSON estruturado).
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    cover_letter: { type: 'STRING' },
    keywords_present: { type: 'ARRAY', items: { type: 'STRING' } },
    keywords_missing: { type: 'ARRAY', items: { type: 'STRING' } },
    match_score: { type: 'INTEGER' },
  },
  required: ['cover_letter', 'keywords_present', 'keywords_missing', 'match_score'],
}

// Parse tolerante: com responseSchema o Gemini já devolve JSON limpo, mas
// mantemos o fallback por segurança.
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
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY não configurada no servidor.' }, 500)
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

    // Chamada ao Gemini. responseSchema + responseMimeType forçam JSON estruturado.
    const geminiRes = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `CURRÍCULO DO CANDIDATO:\n${baseResume}\n\n` +
                  `DESCRIÇÃO DA VAGA:\n${application.job_description.trim()}`,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: MAX_TOKENS,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
    })

    if (!geminiRes.ok) {
      const detail = await geminiRes.text()
      console.error('Gemini error', geminiRes.status, detail)
      if (geminiRes.status === 429) {
        return json(
          {
            error:
              'Limite gratuito do Gemini atingido no momento. Aguarde cerca de 1 minuto e tente novamente (evite clicar várias vezes seguidas).',
          },
          429,
        )
      }
      return json({ error: 'Falha ao gerar com a IA. Tente novamente.' }, 502)
    }

    const payload = await geminiRes.json()

    // Prompt bloqueado por segurança antes de gerar qualquer coisa.
    if (payload?.promptFeedback?.blockReason) {
      return json({ error: 'A IA não pôde processar este conteúdo.' }, 422)
    }

    const candidate = payload?.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason === 'SAFETY') {
      return json({ error: 'A IA não pôde processar este conteúdo.' }, 422)
    }

    const text = (candidate?.content?.parts ?? [])
      .map((p: any) => p?.text ?? '')
      .join('')

    if (!text.trim()) {
      return json({ error: 'A IA não retornou resposta. Tente novamente.' }, 502)
    }

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
