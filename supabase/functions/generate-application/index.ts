// Supabase Edge Function: generate-application (Groq)
//
// Gera carta de apresentação + análise de compatibilidade + dicas de entrevista,
// aplicando o limite mensal do plano (free: 3 gerações/mês; pro: ilimitado).
// A chave (GROQ_API_KEY) fica APENAS aqui no servidor — nunca no frontend.
//
// Chave grátis em https://console.groq.com/keys → secret GROQ_API_KEY.
// Deploy com verify_jwt desligado (a auth é validada aqui dentro, via getUser + RLS).

import { createClient } from 'npm:@supabase/supabase-js@2'

const MODEL = 'llama-3.3-70b-versatile'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MAX_TOKENS = 2000
const FREE_MONTHLY_LIMIT = 3

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

const SYSTEM_PROMPT = `Você é um assistente especialista em recrutamento e carreira, escrevendo em português do Brasil.

A partir do CURRÍCULO de um candidato e da DESCRIÇÃO DE UMA VAGA, você deve:
1. Escrever uma carta de apresentação personalizada, com tom profissional e caloroso, em português. Foque nos pontos do currículo que MAIS combinam com a vaga. Seja específico e evite clichês genéricos. Não invente experiências que não estão no currículo.
2. Identificar as palavras-chave e competências mais importantes da vaga que ESTÃO presentes no currículo (keywords_present).
3. Identificar as palavras-chave e competências importantes da vaga que NÃO estão no currículo (keywords_missing).
4. Calcular um match_score de 0 a 100 representando a compatibilidade geral do currículo com a vaga.
5. Listar 5 perguntas que provavelmente serão feitas na entrevista DESTA vaga (interview_tips), cada uma com uma dica curta e prática de como ESTE candidato deve responder — aproveitando os pontos fortes do currículo e preparando-o para as lacunas.

Responda SOMENTE com um objeto JSON válido, exatamente neste formato:
{"cover_letter": "texto da carta", "keywords_present": ["..."], "keywords_missing": ["..."], "match_score": 0, "interview_tips": [{"question": "...", "tip": "..."}]}`

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
  let score = Number(raw?.match_score)
  if (!Number.isFinite(score)) score = 0
  score = Math.max(0, Math.min(100, Math.round(score)))
  const tips = Array.isArray(raw?.interview_tips)
    ? raw.interview_tips
        .map((t: any) => ({
          question: String(t?.question ?? '').trim(),
          tip: String(t?.tip ?? '').trim(),
        }))
        .filter((t: { question: string }) => t.question)
        .slice(0, 8)
    : []
  return {
    cover_letter: typeof raw?.cover_letter === 'string' ? raw.cover_letter.trim() : '',
    keywords_present: arr(raw?.keywords_present),
    keywords_missing: arr(raw?.keywords_missing),
    match_score: score,
    interview_tips: tips,
  }
}

function nextMonthUtc(from: Date) {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  try {
    const apiKey = Deno.env.get('GROQ_API_KEY')
    if (!apiKey) return json({ error: 'GROQ_API_KEY não configurada no servidor.' }, 500)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Não autenticado.' }, 401)

    const { application_id } = await req.json().catch(() => ({}))
    if (!application_id) return json({ error: 'application_id é obrigatório.' }, 400)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return json({ error: 'Sessão inválida.' }, 401)

    const { data: application, error: appError } = await supabase
      .from('applications').select('id, job_description, resume_id').eq('id', application_id).single()
    if (appError || !application) return json({ error: 'Aplicação não encontrada.' }, 404)
    if (!application.job_description?.trim()) return json({ error: 'A descrição da vaga está vazia.' }, 400)

    const { data: profile } = await supabase
      .from('profiles')
      .select('base_resume, plan, generations_used, usage_reset_at, credits, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_active === false) {
      return json({ error: 'Esta conta está desativada. Fale com o suporte.' }, 403)
    }

    // Currículo: usa a versão do repositório vinculada à análise;
    // sem vínculo, cai no base_resume legado do perfil.
    let resumeText: string | null = null
    if (application.resume_id) {
      const { data: resumeRow } = await supabase
        .from('resumes')
        .select('extracted_text')
        .eq('id', application.resume_id)
        .maybeSingle()
      resumeText = resumeRow?.extracted_text?.trim() || null
    }
    if (!resumeText) resumeText = profile?.base_resume?.trim() || null
    const baseResume = resumeText
    if (!baseResume) return json({ error: 'Adicione um currículo no seu perfil antes de gerar.' }, 400)

    // --- Limite do plano (enforçado no servidor) ---
    const plan = profile?.plan ?? 'free'
    let used = profile?.generations_used ?? 0
    let resetAtIso = profile?.usage_reset_at as string | null
    const now = new Date()
    if (!resetAtIso || new Date(resetAtIso) <= now) {
      used = 0
      resetAtIso = nextMonthUtc(now).toISOString()
    }
    // Free esgotado? Créditos avulsos entram como fallback antes do paywall.
    const credits = profile?.credits ?? 0
    let usedCredit = false
    if (plan !== 'pro' && used >= FREE_MONTHLY_LIMIT) {
      if (credits > 0) {
        usedCredit = true
      } else {
        return json(
          {
            error: `Você já usou as ${FREE_MONTHLY_LIMIT} gerações grátis deste mês. Assine o Pro (ilimitado) ou compre um pacote de créditos.`,
            code: 'limit_reached',
          },
          402,
        )
      }
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
              `CURRÍCULO DO CANDIDATO:\n${baseResume}\n\n` +
              `DESCRIÇÃO DA VAGA:\n${application.job_description.trim()}`,
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
    if (!result.cover_letter) return json({ error: 'A IA não retornou uma carta válida.' }, 502)

    // Dicas de entrevista são recurso Pro: para free, guarda vazio + flag de
    // bloqueio (gate no servidor — o dado nunca chega ao cliente free).
    const isPro = plan === 'pro'
    const match_analysis = {
      match_score: result.match_score,
      keywords_present: result.keywords_present,
      keywords_missing: result.keywords_missing,
      interview_tips: isPro ? result.interview_tips : [],
      tips_locked: !isPro,
    }

    const { error: updateError } = await supabase
      .from('applications')
      .update({ generated_letter: result.cover_letter, match_analysis, status: 'completed' })
      .eq('id', application_id)
    if (updateError) return json({ error: 'Não foi possível salvar o resultado.' }, 500)

    // Incrementa o uso via service role (o usuário não tem permissão de UPDATE
    // nessas colunas — ver migration 0003).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const usageUpdate = usedCredit
      ? { credits: credits - 1 }
      : { generations_used: used + 1, usage_reset_at: resetAtIso }
    const { error: usageError } = await admin
      .from('profiles')
      .update(usageUpdate)
      .eq('id', user.id)
    if (usageError) console.error('usage update failed', usageError)

    return json({
      generated_letter: result.cover_letter,
      match_analysis,
      status: 'completed',
      usage: plan === 'pro'
        ? { plan, used: null, limit: null }
        : {
            plan,
            used: usedCredit ? used : used + 1,
            limit: FREE_MONTHLY_LIMIT,
            credits: usedCredit ? credits - 1 : credits,
          },
    })
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro inesperado ao gerar a aplicação.' }, 500)
  }
})
