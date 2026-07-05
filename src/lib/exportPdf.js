// Exporta a carta de apresentação como PDF (texto limpo, paginado).
// Import dinâmico: o jsPDF (pesado) só carrega quando o usuário exporta.
export async function exportLetterPdf(letter, company) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const marginX = 56
  const marginTop = 64
  const marginBottom = 56
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const maxW = pageW - marginX * 2
  const lineH = 16

  // Cabeçalho discreto da marca.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(184, 78, 36) // terracota
  doc.text('MatchCV', marginX, marginTop)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)

  let y = marginTop + 28
  const paragraphs = (letter || '').split('\n')

  for (const para of paragraphs) {
    const lines = para.trim() === '' ? [''] : doc.splitTextToSize(para, maxW)
    for (const line of lines) {
      if (y > pageH - marginBottom) {
        doc.addPage()
        y = marginTop
      }
      doc.text(line, marginX, y)
      y += lineH
    }
  }

  const safe = (company?.trim() || 'vaga').replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()
  doc.save(`carta-${safe}.pdf`)
}
