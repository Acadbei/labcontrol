import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import {
  extractDocxText,
  extractPptxSlides,
  MAX_ARCHIVE_ENTRY_SIZE,
  openSafeOfficeArchive
} from '../src/lib/documents/office-archive.mjs';

let passed = 0;
function check(value, label) {
  assert.ok(value, label);
  passed += 1;
  console.log(`[PASS] ${label}`);
}

const docx = new AdmZip();
docx.addFile('word/document.xml', Buffer.from('<w:document><w:p><w:r><w:t>Sinov &amp; &lt;w:tag/&gt; matn</w:t></w:r></w:p></w:document>'));
const safeDocx = openSafeOfficeArchive(docx.toBuffer());
check(extractDocxText(safeDocx) === 'Sinov & <w:tag/> matn', 'DOCX matni XML entity va escaped teglar bilan chiqariladi');

const pptx = new AdmZip();
pptx.addFile('ppt/slides/slide2.xml', Buffer.from('<p:sld><a:t>Ikkinchi</a:t></p:sld>'));
pptx.addFile('ppt/slides/slide1.xml', Buffer.from('<p:sld><a:t>Birinchi</a:t></p:sld>'));
const slides = extractPptxSlides(openSafeOfficeArchive(pptx.toBuffer()));
check(slides.length === 2 && slides[0].slideNum === 1 && slides[1].slideNum === 2, 'PPTX slaydlari raqam bo‘yicha saralanadi va sahifa izi saqlanadi');

const excessive = new AdmZip();
excessive.addFile('oversized.xml', Buffer.alloc(MAX_ARCHIVE_ENTRY_SIZE + 1, 0x61));
assert.throws(() => openSafeOfficeArchive(excessive.toBuffer()), /ruxsat etilgan hajmdan katta/);
passed += 1;
console.log('[PASS] ZIP yozuvi hajmi chegaradan oshsa office parser rad etadi');

const missing = new AdmZip();
assert.throws(() => extractDocxText(openSafeOfficeArchive(missing.toBuffer())), /asosiy hujjat topilmadi/);
passed += 1;
console.log('[PASS] DOCX tarkibida asosiy hujjat bo‘lmasa placeholder yaratilmaydi');

console.log(`\nNatija: ${passed}/${passed} hujjat parser tekshiruvlari o‘tdi.`);
