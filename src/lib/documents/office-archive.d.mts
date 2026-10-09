import AdmZip from 'adm-zip';

export const MAX_ARCHIVE_ENTRIES: number;
export const MAX_ARCHIVE_ENTRY_SIZE: number;
export const MAX_ARCHIVE_TOTAL_SIZE: number;
export function openSafeOfficeArchive(buffer: Buffer): AdmZip;
export function extractDocxText(zip: AdmZip): string;
export function extractPptxSlides(zip: AdmZip): Array<{ slideNum: number; text: string }>;
