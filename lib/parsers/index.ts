import { extractPdfText } from './pdf'
import { extractDocxText } from './docx'
import { extractCsvText } from './csv'

export async function extractText(
  buffer: Buffer,
  fileType: 'pdf' | 'docx' | 'csv'
): Promise<string> {
  switch (fileType) {
    case 'pdf':
      return extractPdfText(buffer)
    case 'docx':
      return extractDocxText(buffer)
    case 'csv':
      return extractCsvText(buffer)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export { extractPdfText } from './pdf'
export { extractDocxText } from './docx'
export { extractCsvText, parseStructuredCsv } from './csv'
