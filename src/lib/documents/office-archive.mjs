import AdmZip from 'adm-zip';

export const MAX_ARCHIVE_ENTRIES = 5_000;
export const MAX_ARCHIVE_ENTRY_SIZE = 25 * 1024 * 1024;
export const MAX_ARCHIVE_TOTAL_SIZE = 100 * 1024 * 1024;

/** @param {Buffer} buffer */
export function openSafeOfficeArchive(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  if (entries.length > MAX_ARCHIVE_ENTRIES) throw new Error('Office faylida juda ko‘p ZIP yozuvi bor');
  let totalSize = 0;
  for (const entry of entries) {
    const size = entry.header.size;
    if (!Number.isSafeInteger(size) || size < 0 || size > MAX_ARCHIVE_ENTRY_SIZE) {
      throw new Error('Office faylidagi ZIP yozuvi ruxsat etilgan hajmdan katta');
    }
    totalSize += size;
    if (totalSize > MAX_ARCHIVE_TOTAL_SIZE) throw new Error('Office faylining ochilgan hajmi ruxsat etilgan chegaradan katta');
  }
  return zip;
}

/** @param {string} value */
function decodeXml(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (code[0] !== '#') return named[code.toLowerCase()] || entity;
    const number = code[1].toLowerCase() === 'x' ? Number.parseInt(code.slice(2), 16) : Number.parseInt(code.slice(1), 10);
    try { return Number.isSafeInteger(number) ? String.fromCodePoint(number) : entity; } catch { return entity; }
  });
}

/** @param {string} xml @param {'w'|'a'} tagPrefix */
function extractTextNodes(xml, tagPrefix) {
  const matcher = new RegExp(`<${tagPrefix}:t\\b[^>]*>([\\s\\S]*?)<\\/${tagPrefix}:t>`, 'g');
  return [...xml.matchAll(matcher)].map(match => decodeXml(match[1]).trim()).filter(Boolean).join(' ');
}

/** @param {any} zip */
export function extractDocxText(zip) {
  const document = zip.getEntry('word/document.xml');
  if (!document) throw new Error('DOCX faylida asosiy hujjat topilmadi');
  return extractTextNodes(document.getData().toString('utf8'), 'w');
}

/** @param {any} zip */
export function extractPptxSlides(zip) {
  return zip.getEntries()
    .map(entry => ({ entry, match: entry.entryName.match(/^ppt\/slides\/slide(\d+)\.xml$/) }))
    .filter(item => item.match)
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]))
    .map(({ entry, match }) => ({
      slideNum: Number(match[1]),
      text: extractTextNodes(entry.getData().toString('utf8'), 'a')
    }))
    .filter(slide => slide.text.length > 0);
}
