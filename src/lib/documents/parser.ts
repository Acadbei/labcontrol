import fs from 'fs';
import path from 'path';
import { SupportedFileType, TechnicalParameter, DocumentChunk } from '@/types';
import { extractDocxText, extractPptxSlides, openSafeOfficeArchive } from './office-archive.mjs';

export interface ParseResult {
  text: string;
  summary: string;
  pageCount?: number;
  slideCount?: number;
  wordCount: number;
  technicalParameters: TechnicalParameter[];
  chunks: Omit<DocumentChunk, 'id' | 'docId'>[];
  tags: string[];
}

export async function parseDocumentFile(
  filePath: string,
  originalFilename: string,
  fileType: SupportedFileType
): Promise<ParseResult> {
  let fullText = '';
  let pageCount: number | undefined;
  let slideCount: number | undefined;
  const slidePages: { pageNum: number; content: string }[] = [];

  const ext = path.extname(originalFilename).toLowerCase();
  const fileBuffer = fs.readFileSync(filePath);

  const officeArchive = ['.docx', '.pptx'].includes(ext) ? openSafeOfficeArchive(fileBuffer) : undefined;

  if (fileType === 'pdf' || ext === '.pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default;
      let pageIndex = 0;
      const pdfData = await pdfParse(fileBuffer, {
        pagerender: async (pageData: any) => {
          const textContent = await pageData.getTextContent({ normalizeWhitespace: false, disableCombineTextItems: false });
          const pageText = textContent.items.map((item: any) => typeof item.str === 'string' ? item.str : '').join(' ').trim();
          pageIndex += 1;
          if (pageText) slidePages.push({ pageNum: pageIndex, content: pageText });
          return pageText;
        }
      });
      fullText = pdfData.text || '';
      pageCount = Number.isInteger(pdfData.numpages) && pdfData.numpages > 0 ? pdfData.numpages : undefined;
    } catch (e) {
      throw new Error('PDF matnini ajratib bo‘lmadi');
    }
  } else if (fileType === 'docx' || ext === '.docx') {
    try {
      fullText = extractDocxText(officeArchive!);
      pageCount = undefined;
    } catch (e) {
      throw new Error('DOCX matnini ajratib bo‘lmadi');
    }
  } else if (fileType === 'pptx' || ext === '.pptx') {
    try {
      const slides = extractPptxSlides(officeArchive!);
      if (slides.length === 0) throw new Error('PPTX faylida matnli slayd topilmadi');
      slideCount = slides.length;
      const slideTexts: string[] = [];

      slides.forEach(slide => {
        const text = `Slayd ${slide.slideNum}: ${slide.text}`;
        slideTexts.push(text);
        slidePages.push({ pageNum: slide.slideNum, content: text });
      });

      fullText = slideTexts.join('\n\n');
    } catch (e) {
      throw new Error('PPTX matnini ajratib bo‘lmadi');
    }
  } else if (['.txt', '.md', '.csv'].includes(ext)) {
    fullText = fileBuffer.toString('utf8');
    pageCount = undefined;
  } else {
    throw new Error('Bu fayl turi uchun matn ajratgich mavjud emas');
  }

  const cleanText = fullText.replace(/\r\n/g, '\n').trim();
  const wordCount = cleanText.split(/\s+/).filter(Boolean).length;

  // Extract technical parameters
  const technicalParameters = extractTechnicalParameters(cleanText);

  // Extract relevant tags
  const tags = extractTags(cleanText, originalFilename);

  // Generate automated technical summary
  const summary = generateAutoSummary(cleanText, originalFilename, technicalParameters);

  // Chunking
  const chunks = createChunks(cleanText, slidePages);

  return {
    text: cleanText,
    summary,
    pageCount,
    slideCount,
    wordCount,
    technicalParameters,
    chunks,
    tags
  };
}

function extractTechnicalParameters(text: string): TechnicalParameter[] {
  const params: TechnicalParameter[] = [];

  // Pressure
  const pressureMatch = text.match(/(\d+(?:\.\d+)?(?:\s*–\s*\d+(?:\.\d+)?)?)\s*(MPa|bar|kPa)/i);
  if (pressureMatch) {
    params.push({ key: 'Bosim diapazoni', value: pressureMatch[1].trim(), unit: pressureMatch[2].toUpperCase(), category: 'Sensor' });
  }

  // Voltage
  const voltMatch = text.match(/(\d+(?:\.\d+)?)\s*(V|mV|kV)\b/i);
  if (voltMatch) {
    params.push({ key: 'Kuchlanish', value: voltMatch[1], unit: voltMatch[2], category: 'Power' });
  }

  // Current
  const currentMatch = text.match(/(\d+(?:\.\d+)?)\s*(uA|µA|mA|A)\b/i);
  if (currentMatch) {
    params.push({ key: 'Iste’mol oqimi', value: currentMatch[1], unit: currentMatch[2], category: 'Power' });
  }

  // Frequency
  const freqMatch = text.match(/(\d+(?:\.\d+)?)\s*(MHz|GHz|kHz|Hz)\b/i);
  if (freqMatch) {
    params.push({ key: 'Chastota', value: freqMatch[1], unit: freqMatch[2], category: 'Hardware' });
  }

  // Speed
  const speedMatch = text.match(/(\d+(?:\.\d+)?)\s*(m\/s|km\/h)/i);
  if (speedMatch) {
    params.push({ key: 'Tezlik', value: speedMatch[1], unit: speedMatch[2], category: 'Motion' });
  }

  // Mass/Weight
  const weightMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|gramm|g)\b/i);
  if (weightMatch) {
    params.push({ key: 'Og‘irlik / Yuk', value: weightMatch[1], unit: weightMatch[2], category: 'Mechanics' });
  }

  // IP protection
  const ipMatch = text.match(/\b(IP\s*6[578])\b/i);
  if (ipMatch) {
    params.push({ key: 'Himoya klassi', value: ipMatch[1].toUpperCase().replace(/\s+/, ''), category: 'Mechanics' });
  }

  // Microcontrollers
  const mcuPatterns = ['ESP32-S3', 'ESP32', 'STM32F4', 'STM32', 'ARM Cortex', 'RP2040'];
  for (const mcu of mcuPatterns) {
    if (new RegExp(mcu, 'i').test(text)) {
      params.push({ key: 'Mikrokontroller', value: mcu, category: 'Hardware' });
      break;
    }
  }

  // Protocols
  const protocols = ['LoRaWAN', 'NB-IoT', 'CAN', 'RS485', 'Modbus', 'SPI', 'I2C', 'UART', 'BLE', 'Wi-Fi'];
  const foundProtocols = protocols.filter(p => new RegExp(`\\b${p}\\b`, 'i').test(text));
  if (foundProtocols.length > 0) {
    params.push({ key: 'Aloqa interfeyslari', value: foundProtocols.join(', '), category: 'Wireless/Comms' });
  }

  return params;
}

function extractTags(text: string, filename: string): string[] {
  const candidates = [
    'ESP32-S3', 'STM32', 'Bosim sensori', 'IP68', 'NB-IoT', 'LoRaWAN',
    'AMR', 'Robototexnika', 'BLDC', 'LiDAR', 'SLAM',
    'Spektrometr', 'Optika', 'Lazer', 'SolidWorks', 'CAD',
    'Sinov', 'Dasturiy ta’minot', 'Chizma', 'Mexanika'
  ];

  const matched = new Set<string>();
  const combined = (text + ' ' + filename).toLowerCase();

  candidates.forEach(tag => {
    if (combined.includes(tag.toLowerCase())) {
      matched.add(tag);
    }
  });

  if (matched.size === 0) {
    return [];
  }

  return Array.from(matched).slice(0, 6);
}

function generateAutoSummary(text: string, filename: string, params: TechnicalParameter[]): string {
  if (!text.trim()) return `${filename}: matn ajratilmadi; indekslanadigan parcha mavjud emas.`;
  if (text.length < 50) {
    return text.trim();
  }

  const lines = text.split('\n').filter(l => l.trim().length > 20);
  const firstSentence = lines[0] || '';
  const secondSentence = lines[1] || '';

  let summary = firstSentence.slice(0, 150);
  if (secondSentence && summary.length < 200) {
    summary += ' ' + secondSentence.slice(0, 150);
  }

  if (params.length > 0) {
    const keyParams = params.slice(0, 3).map(p => `${p.key}: ${p.value}${p.unit ? ' ' + p.unit : ''}`).join(', ');
    summary += ` (Asosiy parametrlar: ${keyParams})`;
  }

  return summary.trim() || `${filename} hujjati tahlil qilindi va bilimlar bazasiga kiritildi.`;
}

function createChunks(
  fullText: string,
  slidePages: { pageNum: number; content: string }[]
): Omit<DocumentChunk, 'id' | 'docId'>[] {
  const chunks: Omit<DocumentChunk, 'id' | 'docId'>[] = [];
  let chunkIdx = 0;

  if (slidePages.length > 0) {
    slidePages.forEach(sp => {
      const pText = sp.content.trim();
      if (pText.length === 0) return;

      // If page is larger than 800 chars, break into sub-chunks
      const maxLen = 750;
      if (pText.length > maxLen) {
        let start = 0;
        while (start < pText.length) {
          const slice = pText.slice(start, start + maxLen);
          chunks.push({
            chunkIndex: chunkIdx++,
            pageOrSlide: sp.pageNum,
            text: slice.trim()
          });
          start += maxLen - 100; // 100 char overlap
        }
      } else {
        chunks.push({
          chunkIndex: chunkIdx++,
          pageOrSlide: sp.pageNum,
          text: pText
        });
      }
    });
  } else {
    // Pure text chunking
    const chunkSize = 600;
    const overlap = 100;
    let i = 0;

    while (i < fullText.length) {
      const slice = fullText.slice(i, i + chunkSize);
      chunks.push({
        chunkIndex: chunkIdx++,
        text: slice.trim()
      });
      i += chunkSize - overlap;
    }
  }

  return chunks.slice(0, 50); // safety cap per document
}
