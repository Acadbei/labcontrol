const POSITION_BY_ROLE = new Map([
  ['HEAD', 'Laboratoriya boshlig‘i'],
  ['BACKEND_DEVELOPER', 'Backend dasturchi'],
  ['FRONTEND_DEVELOPER', 'Frontend dasturchi'],
  ['DEVELOPER', 'Umumiy dasturchi'],
  ['CONSTRUCTOR', 'Konstruktor, 3D loyihalovchi'],
]);

function displayName(value) {
  // The source has one Latin/Cyrillic homoglyph in a surname; normalize that
  // visually identical character while preserving the supplied spelling.
  const normalized = value.replaceAll('\u041e', 'O').replaceAll('\u043e', 'o').trim();
  return normalized.split(/\s+/).map(word => {
    const chars = Array.from(word.toLocaleLowerCase('uz-Latn'));
    if (!chars.length) return word;
    chars[0] = chars[0].toLocaleUpperCase('uz-Latn');
    return chars.join('');
  }).join(' ');
}

function loginIdFromName(value, fallbackId) {
  const nameParts = value.split(/\s+/).filter(Boolean);
  const givenName = nameParts.pop();
  const rankPrefixes = new Set(['podpolkovnik', 'polkovnik', 'mayor', 'kapitan', 'leytenant']);
  const familyName = nameParts.reverse().find(part => !rankPrefixes.has(part.toLocaleLowerCase('uz-Latn')));
  if (!givenName || !familyName) return fallbackId;

  const normalize = part => part.toLocaleLowerCase('uz-Latn')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const loginId = `${normalize(givenName)}_${normalize(familyName)}`;
  return /^[a-z0-9][a-z0-9._-]{1,79}$/.test(loginId) ? loginId : fallbackId;
}

function getRole(roleText) {
  const normalized = roleText.trim().toUpperCase();
  if (normalized === 'ADMIN / HEAD') return { role: 'ADMIN', profile: 'HEAD' };
  if (normalized === 'SUPER_ADMIN / BACKEND_DEVELOPER') return { role: 'SUPER_ADMIN', profile: 'BACKEND_DEVELOPER' };
  if (normalized.startsWith('USER / FRONTEND_DEVELOPER')) return { role: 'USER', profile: 'FRONTEND_DEVELOPER' };
  if (normalized.startsWith('USER / DEVELOPER')) return { role: 'USER', profile: 'DEVELOPER' };
  if (normalized.startsWith('USER / CONSTRUCTOR')) return { role: 'USER', profile: 'CONSTRUCTOR' };
  throw new Error(`Noma’lum xodim roli: ${roleText}`);
}

export function parseStaffRoster(text) {
  const sections = text.split(/(?=^#\s+\d+\.\s+)/m);
  const roster = [];

  for (const section of sections) {
    const heading = section.match(/^#\s+(\d+)\.\s+(.+?)\s+[—–-]\s+(.+?)\s*$/m);
    if (!heading) continue;
    const roleMatch = section.match(/^Role:\s*\r?\n+\s*`([^`]+)`/m);
    if (!roleMatch) continue;

    const [, numberText, sourceName] = heading;
    const number = Number(numberText);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('Roster bo‘lim raqami yaroqsiz');
    const { role, profile } = getRole(roleMatch[1]);
    const suffix = String(number).padStart(2, '0');
    const staffRosterId = `staff-${suffix}`;
    const name = displayName(sourceName);
    roster.push({
      id: staffRosterId,
      staffRosterId,
      loginId: loginIdFromName(name, staffRosterId),
      name,
      email: '',
      role,
      position: POSITION_BY_ROLE.get(profile),
      permissions: [],
      identitySource: 'data/xodim.txt',
    });
  }

  const ids = new Set(roster.map(person => person.staffRosterId));
  if (ids.size !== roster.length) throw new Error('Roster’da takrorlangan xodim bo‘limi bor');
  return roster;
}
