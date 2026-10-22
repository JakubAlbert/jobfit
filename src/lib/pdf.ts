// Extracts plain text from a PDF CV in the browser with pdf.js. Nothing is uploaded anywhere.

export class PdfError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'PdfError'
  }
}

/** The part of a pdf.js text item this module needs. */
export interface TextPiece {
  str: string
  hasEOL: boolean
}

/** Pages with less text than this are treated as a scan without a text layer. */
const MIN_TEXT_LENGTH = 50

export async function extractPdfText(data: ArrayBuffer): Promise<string> {
  // pdf.js is large, so it is loaded only when a PDF is actually opened.
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const loadingTask = pdfjs.getDocument({ data })
  const pages: TextPiece[][] = []
  try {
    const pdf = await loadingTask.promise
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      // Items without "str" are marked content, not text.
      pages.push(
        content.items.flatMap((item) => ('str' in item ? [{ str: item.str, hasEOL: item.hasEOL }] : [])),
      )
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') {
      throw new PdfError('PDF je chránené heslom. Ulož ho bez hesla alebo vlož text ručne.', { cause: error })
    }
    throw new PdfError('Súbor sa nepodarilo prečítať ako PDF.', { cause: error })
  } finally {
    await loadingTask.destroy()
  }

  const text = joinPdfText(pages)
  if (text.replace(/\s/g, '').length < MIN_TEXT_LENGTH) {
    throw new PdfError(
      'V PDF sa nenašiel text. Pravdepodobne je to sken alebo obrázok. Skopíruj text CV a vlož ho ručne.',
    )
  }
  return text
}

/** Joins pdf.js text items into lines and pages into paragraphs, tidying up whitespace. */
export function joinPdfText(pages: TextPiece[][]): string {
  return pages
    .map((items) =>
      items
        .map((item) => item.str + (item.hasEOL ? '\n' : ''))
        .join('')
        .split('\n')
        .map((line) => line.replace(/[ \t ]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n')
}
