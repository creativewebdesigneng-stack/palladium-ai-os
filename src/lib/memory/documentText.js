/**
 * Client-side document reading.
 *
 * Text is extracted in the browser so the server only ever receives plain text
 * for chunking and embedding — the original file goes to private storage
 * untouched. PDF support is lazy-loaded so the reader never ships to routes
 * that don't upload documents.
 */

const TEXT_TYPES = /^(text\/|application\/json$|application\/xml$)/;
const TEXT_EXT = /\.(txt|md|markdown|csv|tsv|json|ya?ml|log|html?|xml)$/i;

/** Extracts readable text from a file, or returns '' when the type is unsupported. */
export async function extractDocumentText(file) {
  if (!file) return '';

  if (TEXT_TYPES.test(file.type) || TEXT_EXT.test(file.name)) {
    return (await file.text()).slice(0, 400000);
  }

  if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
    return await readPdf(file);
  }

  return '';
}

async function readPdf(file) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  const limit = Math.min(doc.numPages, 200);
  for (let i = 1; i <= limit; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str || '').join(' '));
  }
  return pages.join('\n\n').replace(/[ \t]{2,}/g, ' ').trim().slice(0, 400000);
}

/** Human-readable list of what the browser can read, for the upload modal. */
export const READABLE_HINT = 'PDF, TXT, Markdown, CSV, JSON, YAML and HTML can be read automatically. For anything else, add a written summary.';
