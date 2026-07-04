// Extração de texto de PDF no navegador (pdfjs), sem custo de API.
// Import dinâmico para não pesar o bundle inicial — a lib só carrega
// quando o usuário realmente envia um PDF.
export async function extractPdfText(file) {
  const pdfjs = await import('pdfjs-dist')
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise

  let text = ''
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map((item) => item.str ?? '').join(' ') + '\n'
  }
  try {
    doc.destroy()
  } catch {
    /* ignora */
  }
  return text.replace(/[ \t]+/g, ' ').trim()
}
