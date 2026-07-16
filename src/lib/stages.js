// Etapas do kanban de candidaturas. Fonte única, compartilhada entre o
// Dashboard, a tela da vaga e o seletor de etapa (StageSelect).
export const STAGES = [
  { id: 'saved', label: 'Salvas', emoji: '📌', dot: 'bg-slate-400', tint: 'bg-slate-400' },
  { id: 'applied', label: 'Aplicadas', emoji: '📨', dot: 'bg-brand-500', tint: 'bg-brand-500' },
  { id: 'interview', label: 'Entrevista', emoji: '🎯', dot: 'bg-amber-500', tint: 'bg-amber-500' },
  { id: 'offer', label: 'Oferta', emoji: '🏆', dot: 'bg-olive-500', tint: 'bg-olive-500' },
  { id: 'rejected', label: 'Recusadas', emoji: '✕', dot: 'bg-slate-300', tint: 'bg-slate-300' },
]

export function stageById(id) {
  return STAGES.find((s) => s.id === id) || STAGES[0]
}
