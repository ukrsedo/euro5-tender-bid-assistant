import { extractText, getDocumentProxy } from 'unpdf';
import { unzipSync } from 'fflate';

const MAX_DOCUMENTS = 8;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_PDF_PAGES = 60;
const MAX_EXTRACTED_CHARS = 48_000;

function docKind(document) {
  const descriptor = [document?.title, document?.format, document?.mimeType, document?.mediaType, document?.url].filter(Boolean).join(' ').toLowerCase();
  if (/\.pdf(?:\b|\?)/i.test(descriptor) || /application\/pdf/.test(descriptor)) return 'pdf';
  if (/\.docx(?:\b|\?)/i.test(descriptor) || /wordprocessingml\.document/.test(descriptor)) return 'docx';
  return null;
}
const TRUSTED_DOCUMENT_DOMAINS = ['prozorro.gov.ua', 'openprocurement.org'];
const MAX_DOCUMENT_REDIRECTS = 5;
function isTrustedProzorroDocumentUrl(url) {
  return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
    TRUSTED_DOCUMENT_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith('.' + domain));
}
async function fetchProzorroDocument(initialUrl, fetcher) {
  let url = new URL(initialUrl);
  for (let redirects = 0; ; redirects++) {
    if (!isTrustedProzorroDocumentUrl(url)) throw new Error('Посилання перенаправляє на неперевірений домен.');
    const response = await fetcher(url.toString(), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    if (redirects >= MAX_DOCUMENT_REDIRECTS) throw new Error('Перевищено ліміт перенаправлень документа.');
    const location = response.headers.get('location');
    if (!location) throw new Error('Сервер перенаправив документ без адреси Location.');
    url = new URL(location, url);
    if (!isTrustedProzorroDocumentUrl(url)) throw new Error('Посилання перенаправляє на неперевірений домен.');
  }
}
function decodeXml(text) {
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function docxParagraphs(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const entry = files['word/document.xml'];
  if (!entry) throw new Error('DOCX не містить word/document.xml.');
  const xml = new TextDecoder().decode(entry);
  const paragraphs = [];
  for (const match of xml.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const p = match[1];
    const text = [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(x => decodeXml(x[1])).join('');
    if (!text.trim()) continue;
    const style = p.match(/<w:pStyle[^>]*w:val="([^"]+)"/)?.[1] || '';
    const heading = /^heading([1-6])$/i.test(style) ? 'Розділ ' + style.replace(/\D/g, '') + ': ' : '';
    paragraphs.push(heading + text.trim());
  }
  if (!paragraphs.length) throw new Error('У DOCX не знайдено текстових абзаців.');
  return paragraphs;
}
async function extractOne(document, fetcher, remainingBytes) {
  const kind = docKind(document);
  if (!kind) return { title: document?.title || 'Без назви', status: 'unsupported', reason: 'Підтримуються вкладення PDF і DOCX.' };
  let url;
  try { url = new URL(document?.url); } catch { return { title: document?.title || 'Без назви', status: 'unavailable', reason: 'Посилання на документ відсутнє.' }; }
  if (url.protocol !== 'https:' || !/(^|\.)prozorro\.gov\.ua$/i.test(url.hostname))
    return { title: document?.title || 'Без назви', status: 'blocked', reason: 'Дозволені лише захищені посилання на Prozorro.' };
  try {
    const response = await fetchProzorroDocument(url, fetcher);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > MAX_FILE_BYTES || (remainingBytes > 0 && declared > remainingBytes)) throw new Error('Файл перевищує ліміт розміру документа.');
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_FILE_BYTES || buffer.byteLength > remainingBytes) throw new Error('Файл перевищує ліміт розміру документа.');
    const finalUrl = new URL(response.url || url.toString());
    if (!isTrustedProzorroDocumentUrl(finalUrl)) throw new Error('Посилання перенаправляє на неперевірений домен.');
    const title = document?.title || url.pathname.split('/').pop() || 'Без назви';
    if (kind === 'docx') {
      const paragraphs = docxParagraphs(buffer);
      return { title, kind, bytes: buffer.byteLength, pages: null, text: paragraphs.map((line, i) => '[абзац ' + (i + 1) + '] ' + line).join('\n') };
    }
    const pdf = await getDocumentProxy(new Uint8Array(buffer), { isOffscreenCanvasSupported: false, isImageDecoderSupported: false, maxImageSize: 16_777_216 });
    if (pdf.numPages > MAX_PDF_PAGES) throw new Error('PDF має понад ' + MAX_PDF_PAGES + ' сторінок.');
    const result = await extractText(pdf, { mergePages: false });
    const pages = Array.isArray(result.text) ? result.text : [result.text];
    return { title, kind, bytes: buffer.byteLength, pages: result.totalPages, text: pages.map((page, i) => '[сторінка ' + (i + 1) + '] ' + String(page || '').trim()).filter(Boolean).join('\n') };
  } catch (error) {
    return { title: document?.title || 'Без назви', kind, status: 'error', reason: String(error?.message || 'Не вдалося прочитати файл').slice(0, 240) };
  }
}
export async function readTenderDocuments(documents, fetcher = fetch) {
  const candidates = (documents || []).filter(d => docKind(d)).slice(0, MAX_DOCUMENTS);
  const out = [];
  let totalBytes = 0;
  for (const document of candidates) {
    const item = await extractOne(document, fetcher, MAX_TOTAL_BYTES - totalBytes);
    totalBytes += item.bytes || 0;
    // The file size is enforced per attachment. Keep prompt content bounded at aggregate level.
    if (item.text) {
      const remaining = MAX_EXTRACTED_CHARS - totalBytes;
      if (remaining <= 0) { item.text = ''; item.status = 'truncated'; item.reason = 'Досягнуто ліміт спільного обсягу тексту.'; }
      else if (item.text.length > remaining) { item.text = item.text.slice(0, remaining); item.status = 'truncated'; item.reason = 'Текст скорочено через ліміт 48 000 символів.'; }
      item.status ||= 'read';
    } else {
      item.status ||= 'no_text';
      item.reason ||= 'Не знайдено текстового шару. PDF може бути скан-копією.';
    }
    out.push(item);
  }
  return out;
}
export function formatTenderDocumentsForAI(items) {
  if (!items?.length) return 'Вкладень PDF або DOCX, опублікованих до оголошення, не знайдено.';
  return items.map(item => {
    if (!item.text) return 'Документ: ' + item.title + ' | статус: ' + item.status + (item.reason ? ' | причина: ' + item.reason : '');
    return 'Документ: ' + item.title + ' | статус: ' + item.status + (item.pages ? ' | сторінок: ' + item.pages : ' | посилання на сторінки у DOCX не визначаються; цитуй номер абзацу') + '\n' + item.text;
  }).join('\n\n');
}
