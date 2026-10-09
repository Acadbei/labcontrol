/**
 * O‘zbek tili Lotin va Kirill yozuvlari o‘rtasida transliteratsiya moduli.
 */

const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  'А': 'A', 'а': 'a',
  'Б': 'B', 'б': 'b',
  'В': 'V', 'в': 'v',
  'Г': 'G', 'г': 'g',
  'Д': 'D', 'д': 'd',
  'Е': 'E', 'е': 'e',
  'Ё': 'Yo', 'ё': 'yo',
  'Ж': 'J', 'ж': 'j',
  'З': 'Z', 'з': 'z',
  'И': 'I', 'и': 'i',
  'Й': 'Y', 'й': 'y',
  'К': 'K', 'к': 'k',
  'Л': 'L', 'л': 'l',
  'М': 'M', 'м': 'm',
  'Н': 'N', 'н': 'n',
  'О': 'O', 'о': 'o',
  'П': 'P', 'п': 'p',
  'Р': 'R', 'р': 'r',
  'С': 'S', 'с': 's',
  'Т': 'T', 'т': 't',
  'У': 'U', 'у': 'u',
  'Ф': 'F', 'ф': 'f',
  'Х': 'X', 'х': 'x',
  'Ц': 'Ts', 'ц': 'ts',
  'Ч': 'Ch', 'ч': 'ch',
  'Ш': 'Sh', 'ш': 'sh',
  'Ъ': '\'', 'ъ': '\'',
  'Ь': '', 'ь': '',
  'Э': 'E', 'э': 'e',
  'Ю': 'Yu', 'ю': 'yu',
  'Я': 'Ya', 'я': 'ya',
  'Ў': 'O‘', 'ў': 'o‘',
  'Қ': 'Q', 'қ': 'q',
  'Ғ': 'G‘', 'ғ': 'g‘',
  'Ҳ': 'H', 'ҳ': 'h'
};

export function cyrillicToLatin(text: string): string {
  if (!text) return '';
  let result = '';

  // E / Ye qoidasi
  const len = text.length;
  for (let i = 0; i < len; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : '';

    if (char === 'Е' || char === 'е') {
      const isStart = i === 0 || /\s|[.,!?;:()[\]{}"'«»—-]/.test(prevChar);
      const isVowel = /[АЕЁИОУЭЮЯаеёиоуэюяЎў]/.test(prevChar);
      if (isStart || isVowel) {
        result += char === 'Е' ? 'Ye' : 'ye';
        continue;
      }
    }

    result += CYRILLIC_TO_LATIN_MAP[char] ?? char;
  }
  return result;
}

export function latinToCyrillic(text: string): string {
  if (!text) return '';
  let res = text;

  // Ko‘p harfli birikmalar avval almashtiriladi
  const multiMap: [RegExp, string][] = [
    [/O[‘'`ʻ]/g, 'Ў'], [/o[‘'`ʻ]/g, 'ў'],
    [/G[‘'`ʻ]/g, 'Ғ'], [/g[‘'`ʻ]/g, 'ғ'],
    [/Sh/g, 'Ш'], [/SH/g, 'Ш'], [/sh/g, 'ш'],
    [/Ch/g, 'Ч'], [/CH/g, 'Ч'], [/ch/g, 'ч'],
    [/Yo/g, 'Ё'], [/YO/g, 'Ё'], [/yo/g, 'ё'],
    [/Yu/g, 'Ю'], [/YU/g, 'Ю'], [/yu/g, 'ю'],
    [/Ya/g, 'Я'], [/YA/g, 'Я'], [/ya/g, 'я'],
    [/Ye/g, 'Е'], [/YE/g, 'Е'], [/ye/g, 'е'],
    [/Ts/g, 'Ц'], [/TS/g, 'Ц'], [/ts/g, 'ц']
  ];

  for (const [regex, replacement] of multiMap) {
    res = res.replace(regex, replacement);
  }

  // Bitta harfliklar
  const singleMap: Record<string, string> = {
    'A': 'А', 'a': 'а',
    'B': 'Б', 'b': 'б',
    'D': 'Д', 'd': 'д',
    'E': 'Э', 'e': 'е',
    'F': 'Ф', 'f': 'ф',
    'G': 'Г', 'g': 'г',
    'H': 'Ҳ', 'h': 'ҳ',
    'I': 'И', 'i': 'и',
    'J': 'Ж', 'j': 'ж',
    'K': 'К', 'k': 'к',
    'L': 'Л', 'l': 'л',
    'M': 'М', 'm': 'м',
    'N': 'Н', 'n': 'н',
    'O': 'О', 'o': 'о',
    'P': 'П', 'p': 'п',
    'Q': 'Қ', 'q': 'қ',
    'R': 'Р', 'r': 'р',
    'S': 'С', 's': 'с',
    'T': 'Т', 't': 'т',
    'U': 'У', 'u': 'у',
    'V': 'В', 'v': 'в',
    'X': 'Х', 'x': 'х',
    'Y': 'Й', 'y': 'й',
    'Z': 'З', 'z': 'з',
    '\'': 'ъ', '’': 'ъ', '`': 'ъ', 'ʻ': 'ъ'
  };

  let out = '';
  for (let i = 0; i < res.length; i++) {
    const ch = res[i];
    out += singleMap[ch] ?? ch;
  }
  return out;
}

export function isCyrillic(text: string): boolean {
  return /[а-яёўқғҳА-ЯЁЎҚҒҲ]/.test(text);
}
