import 'server-only';

import fs from 'node:fs';
import path from 'node:path';
import { parseStaffRoster } from './staff-roster.mjs';

export function loadStaffRoster(filePath = path.join(process.cwd(), 'data', 'xodim.txt')) {
  let source: string;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    throw new Error('Haqiqiy xodimlar ro‘yxati data/xodim.txt dan o‘qilmadi; hisoblar provision qilinmadi');
  }

  const roster = parseStaffRoster(source);
  if (roster.length !== 7) {
    throw new Error(`data/xodim.txt dan 7 ta rol profili kutilgan, ${roster.length} ta topildi; hisoblar provision qilinmadi`);
  }
  return roster;
}
