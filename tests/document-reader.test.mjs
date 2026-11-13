import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {readTenderDocuments, formatTenderDocumentsForAI} from '../document-reader.js';

const fixture = new URL('./fixtures/legacy-word-sample.doc', import.meta.url);
const sourceUrl = 'https://public-docs.prozorro.gov.ua/documents/legacy-word-sample.doc';

test('legacy DOC attachments are extracted and receive verifiable fragment citations', async () => {
  const bytes = await readFile(fixture);
  const fetcher = async () => new Response(bytes, {
    status: 200,
    headers: {'content-type': 'application/msword', 'content-length': String(bytes.byteLength)},
  });
  const [document] = await readTenderDocuments([{
    title: 'Додаток 1.doc',
    url: sourceUrl,
    format: 'application/msword',
  }], fetcher);

  assert.equal(document.status, 'read');
  assert.equal(document.kind, 'doc');
  assert.ok(document.paragraphs > 0);
  assert.match(document.text, /^\[фрагмент 1\]/);
  assert.match(document.text, /JSDoc feature showcase/i);
  assert.match(formatTenderDocumentsForAI([document]), /цитуй номер фрагмента/);
});

test('legacy DOC is identified from MIME type when filename has no extension', async () => {
  const bytes = await readFile(fixture);
  const fetcher = async () => new Response(bytes, {status: 200});
  const [document] = await readTenderDocuments([{
    title: 'Додаток без розширення',
    url: sourceUrl,
    mimeType: 'application/msword',
  }], fetcher);
  assert.equal(document.status, 'read');
  assert.equal(document.kind, 'doc');
});
