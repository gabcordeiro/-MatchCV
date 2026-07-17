// Score instantâneo por sobreposição de palavras-chave — roda 100% no navegador.
// É uma PRÉVIA (keyword matching), não a análise semântica com IA do produto.
// Serve de gancho na landing: prova valor sem login, sem custo e sem superfície
// de abuso (nenhuma chamada de servidor). A análise completa é a da Edge Function.

const STOPWORDS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das', 'em', 'no',
  'na', 'nos', 'nas', 'e', 'ou', 'que', 'com', 'sem', 'por', 'para', 'pra', 'pro', 'ao', 'aos',
  'se', 'sua', 'seu', 'suas', 'seus', 'the', 'and', 'of', 'to', 'in', 'for', 'with', 'you',
  'your', 'our', 'we', 'is', 'are', 'be', 'as', 'on', 'at', 'ser', 'ter', 'estar', 'vaga',
  'cargo', 'empresa', 'area', 'trabalho', 'experiencia', 'experiencias', 'requisitos',
  'conhecimento', 'conhecimentos', 'atividades', 'sobre', 'nossa', 'nosso', 'voce', 'anos',
  'ano', 'nivel', 'como', 'mais', 'menos', 'muito', 'todos', 'toda', 'todas', 'todo', 'ele',
  'ela', 'isso', 'este', 'esta', 'esse', 'essa', 'dia', 'ambiente', 'equipe', 'projeto',
  'projetos', 'cliente', 'clientes', 'produto', 'produtos', 'processo', 'processos', 'ainda',
  'sera', 'onde', 'quando', 'entre', 'cada', 'pelo', 'pela', 'nao', 'sim',
  // Ruído comum de anúncio de vaga (descritores, não competências).
  'diferenciais', 'diferencial', 'requisito', 'desejavel', 'desejaveis', 'obrigatorio',
  'pleno', 'junior', 'senior', 'avancado', 'intermediario', 'basico', 'responsabilidades',
  'atuar', 'realizar', 'demais', 'entre', 'formacao', 'superior', 'completo',
])

// Remove acentos (combining diacritical marks U+0300–U+036F) e baixa a caixa.
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Extrai até `max` palavras-chave candidatas da vaga (mais frequentes primeiro),
// preservando a forma original da primeira ocorrência para exibição.
export function extractKeywords(jobText, max = 12) {
  const words = String(jobText || '').match(/[A-Za-zÀ-ÿ0-9+#.]+/g) || []
  const seen = new Map() // norm -> { display, norm, count }
  for (const raw of words) {
    // Remove pontuação das pontas (mantém interna, ex.: "node.js").
    const w = raw.replace(/^[^A-Za-zÀ-ÿ0-9]+|[^A-Za-zÀ-ÿ0-9]+$/g, '')
    const norm = normalize(w)
    if (norm.length < 3) continue
    if (STOPWORDS.has(norm)) continue
    if (/^\d+$/.test(norm)) continue
    const entry = seen.get(norm)
    if (entry) entry.count += 1
    else seen.set(norm, { display: w, norm, count: 1 })
  }
  return [...seen.values()]
    .sort((a, b) => b.count - a.count || a.norm.localeCompare(b.norm))
    .slice(0, max)
}

// Calcula o score instantâneo. Retorna { ok, score, present, missing } ou
// { ok:false, reason } quando não dá pra pontuar.
export function instantScore(jobText, resumeText) {
  const job = String(jobText || '').trim()
  const resume = String(resumeText || '').trim()
  if (job.length < 40) return { ok: false, reason: 'Cole uma descrição de vaga um pouco maior.' }
  if (resume.length < 40) return { ok: false, reason: 'Cole um pouco mais do seu currículo.' }

  const keywords = extractKeywords(job)
  if (keywords.length === 0) {
    return { ok: false, reason: 'Não consegui identificar requisitos nessa vaga.' }
  }

  const resumeNorm = normalize(resume)
  const present = []
  const missing = []
  for (const kw of keywords) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(kw.norm)}([^a-z0-9]|$)`)
    if (re.test(resumeNorm)) present.push(kw.display)
    else missing.push(kw.display)
  }
  const score = Math.round((present.length / keywords.length) * 100)
  return { ok: true, score, present, missing }
}
