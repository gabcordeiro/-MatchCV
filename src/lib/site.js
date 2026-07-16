// Configuração central de identidade e contato do MatchCV.
// >>> TROQUE estes valores pelos oficiais antes de divulgar de verdade. <<<
export const SITE = {
  name: 'MatchCV',

  // E-mail de suporte exibido publicamente e usado como referência de contato.
  supportEmail: 'matchcvcompany@gmail.com',

  // WhatsApp em formato internacional, SÓ DÍGITOS (ex.: '5511999999999').
  // Deixe '' para esconder o botão de WhatsApp automaticamente.
  whatsapp: '5527993122222',
  // Como o número aparece pro usuário (ex.: '(11) 99999-9999'). Opcional.
  whatsappDisplay: '(27) 99312-2222',

  // Operação como pessoa física no Brasil (sem CNPJ). Nome legal é opcional —
  // se preenchido, aparece nas páginas legais para identificar o responsável.
  operatorLegalName: 'Gabriel Cordeiro de Carvalho',
  cityState: 'Brasil',

  // Data da última revisão dos documentos legais (atualize ao editá-los).
  legalUpdatedAt: '16 de julho de 2026',
}

// Monta o link do WhatsApp (ou null se não configurado).
export function whatsappLink(text = '') {
  if (!SITE.whatsapp) return null
  const suffix = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${SITE.whatsapp}${suffix}`
}
