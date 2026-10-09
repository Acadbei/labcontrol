/**
 * LabControl jamoa a’zolarining to‘liq vakolatlari, vazifalari va imkoniyatlari
 * (data/xodim.txt va ichki ma’lumotlar bazasi asosida).
 */

export interface TeamMemberCapability {
  id: string;
  name: string;
  loginId: string;
  role: string;
  position: string;
  specialty: string;
  whatCanDo: string[];
  responsibilities: string;
  keywords: string[];
}

export const TEAM_MEMBERS_CAPABILITIES: TeamMemberCapability[] = [
  {
    id: 'staff-01',
    name: 'Podpolkovnik Boliyev Umar',
    loginId: 'umar_boliyev',
    role: 'ADMIN / HEAD',
    position: 'Laboratoriya boshlig‘i',
    specialty: 'Laboratoriya boshqaruvi, strategik qarorlar, loyihalar va jamoa nazorati',
    whatCanDo: [
      'Laboratoriyadagi barcha loyihalar, xodimlar va vazifalarga umumiy rahbarlik qiladi.',
      'Muhim texnik va tashkiliy qarorlarni qabul qiladi va tasdiqlaydi.',
      'Xodimlarga vazifalar taqsimlaydi va ijro muddatlarini (deadline) belgilaydi.',
      'Kechikayotgan, muammoli va xavfli loyihalarni baholab, tegishli ko‘rsatmalar beradi.',
      'Barcha loyihalar va laboratoriya bo‘yicha umumiy statistik hisobotlarni qabul qiladi.'
    ],
    responsibilities: 'Barcha ma’lumotlarni ko‘rish huquqi, loyihalarni tasdiqlash, buyruq va topshiriqlar berish, umumiy nazorat.',
    keywords: [
      'boliyev', 'umar', 'boshliq', 'rahbar', 'podpolkovnik', 'boshqaruv', 'qaror', 'topshiriq',
      'buyruq', 'tasdiqlash', 'nazorat', 'deadline', 'muddat', 'hisobot', 'laboratoriya boshlig‘i',
      'kim boshqaradi', 'kim qaror qiladi', 'vazifa taqsimlash'
    ]
  },
  {
    id: 'staff-02',
    name: 'Abdumannopov Asadbek',
    loginId: 'asadbek_abdumannopov',
    role: 'SUPER_ADMIN / BACKEND_DEVELOPER',
    position: 'Backend dasturchi / Umumiy administrator',
    specialty: 'Backend, Server, API, Baza, AI/RAG/Ollama (AsadbekGPT), Mikrokontrollerlar, Datchiklar va Firmware asosiy mas’uli',
    whatCanDo: [
      'Backend dasturlash, server arxitekturasi, API va ma’lumotlar bazasini (DB) boshqaradi.',
      'Sun’iy intellekt (AI) konfiguratsiyasi, RAG, Ollama (AsadbekGPT) va qidiruv tizimini boshqaradi.',
      'Mikrokontrollerlar, datchiklar va firmware yo‘nalishining ASOSIY MAS’ULI:',
      'ESP32, STM32 va boshqa mikrokontrollerlarni dasturlash va firmware kodini ishlab chiqish.',
      'Datchik va sensorlarni mikrokontrollerga ulash (suv hisoblagich, bosim, keramika piezorezistiv, harorat).',
      'Aloqa interfeyslarini sozlash: I2C, SPI, UART, RS-485, Modbus protokoli.',
      'Simsiz kommunikatsiya: LoRa, LoRaWAN, LTE/4G, NB-IoT, Wi-Fi, Bluetooth.',
      'Sensorlarni o‘qish algoritmlari, kalibrlash, diagnostika va ma’lumotlarni backend API orqali serverga uzatish.',
      'Tizim xavfsizligi, diagnostika loglari va texnik administratorlik.'
    ],
    responsibilities: 'Texnik tizim va infratuzilma boshqaruvi, backend va mikrokontroller/firmware bo‘yicha yetakchi dasturchi.',
    keywords: [
      'asadbek', 'abdumannopov', 'backend', 'api', 'server', 'database', 'baza', 'mikrokontroller',
      'firmware', 'datchik', 'sensor', 'esp32', 'stm32', 'i2c', 'spi', 'uart', 'rs-485', 'modbus',
      'lora', 'lorawan', 'lte', 'nb-iot', 'wifi', 'bluetooth', 'asadbekgpt', 'acadbekgpt', 'ai',
      'super admin', 'administrator', 'kalibrlash', 'algoritm'
    ]
  },
  {
    id: 'staff-04',
    name: 'Yusupov Ildar',
    loginId: 'ildar_yusupov',
    role: 'DEVELOPER',
    position: 'Umumiy dasturchi',
    specialty: 'Firmware kodini ishlab chiqish, mikrokontroller dasturlari, aloqa protokollari, umumiy dasturlash va kodlarni test qilish',
    whatCanDo: [
      'Mikrokontrollerlar, datchiklar va firmware yo‘nalishida Asadbekka yordamchi dasturchi sifatida ishlaydi.',
      'Firmware kodini ishlab chiqish, sinovdan o‘tkazish (testing) va xatoliklarni tuzatish.',
      'Mikrokontroller dasturlarini optimallashtirish va tezligini oshirish.',
      'Aloqa protokollarini integratsiya qilish va sensorlardan ma’lumot olish kodlarini yozish.',
      'Qurilmalarni server bilan bog‘lash va umumiy dasturiy loyihalarni amalga oshirish.'
    ],
    responsibilities: 'Dasturiy loyihalar, firmware kodlari, aloqa protokollari integratsiyasi va test sinovlari.',
    keywords: [
      'ildar', 'yusupov', 'umumiy dasturchi', 'dasturchi', 'developer', 'firmware kodi', 'firmware test',
      'mikrokontroller dasturi', 'sensor kodi', 'datchik dasturi', 'optimallashtirish', 'aloqa protokoli',
      'kod yozish', 'test qilish', 'qurilma dasturi'
    ]
  },
  {
    id: 'staff-03',
    name: 'Ismoilova Farangiz',
    loginId: 'farangiz_ismoilova',
    role: 'FRONTEND_DEVELOPER',
    position: 'Frontend dasturchi',
    specialty: 'Foydalanuvchi interfeysi (UI/UX), Veb-ilova, React, Next.js, Dashboard, Sensor monitoring grafiklari',
    whatCanDo: [
      'Foydalanuvchi interfeysi (UI/UX) va veb-sayt dizaynini ishlab chiqish (React, Next.js, TailwindCSS).',
      'Mikrokontroller va datchiklardan olingan ma’lumotlarni foydalanuvchiga qulay ko‘rinishda ko‘rsatish.',
      'Sensor ko‘rsatkichlari, qurilma holati, ogohlantirishlar va monitoring grafiklarini (dashboards) yaratish.',
      'Frontend texnik hujjatlari va interfeys komponentlarini ishlab chiqish.'
    ],
    responsibilities: 'Foydalanuvchi interfeysi, frontend dasturlash, sensor ko‘rsatkichlarini vizuallashtirish va boshqaruv panellari.',
    keywords: [
      'farangiz', 'ismoilova', 'frontend', 'ui', 'ux', 'interfeys', 'veb', 'sayt', 'dizayn',
      'grafik', 'monitoring', 'dashboard', 'react', 'nextjs', 'sensor ko‘rsatkichlari', 'vizuallashtirish'
    ]
  },
  {
    id: 'staff-05',
    name: 'Saydahmedov Qurvonali',
    loginId: 'qurvonali_saydahmedov',
    role: 'CONSTRUCTOR / 3D_DESIGNER',
    position: 'Konstruktor, 3D loyihalovchi',
    specialty: '3D modellashtirish, CAD/SAPR chizmalar, mexanik loyihalar, qurilma korpusi (IP68), prototiplash',
    whatCanDo: [
      'Mexanik loyihalar, 3D modellar va texnik chizmalarni ishlab chiqish.',
      'Mikrokontroller va datchiklarning mexanik joylashuvi, o‘lchamlari va fiksatsiyasini loyihalash.',
      'Qurilma germetik korpusi (IP68), montaj elementlari va kabel yo‘nalishlarini ishlab chiqish.',
      'Materiallar tanlash, ishlab chiqarish talablari va 3D prototiplash (Smart Water Meter, AMR roboti mexanikasi).'
    ],
    responsibilities: 'Mexanik konstruktsiyalar, 3D modellar, CAD chizmalar, korpus va montaj loyihalari.',
    keywords: [
      'qurvonali', 'saydahmedov', 'konstruktor', '3d', 'cad', 'sapr', 'chizma', 'mexanika',
      'korpus', 'germetik', 'ip68', 'montaj', 'prototip', 'o‘lcham', 'material', '3d model'
    ]
  },
  {
    id: 'staff-06',
    name: 'Turdiyev Muhammadali',
    loginId: 'muhammadali_turdiyev',
    role: 'CONSTRUCTOR / 3D_DESIGNER',
    position: 'Konstruktor, 3D loyihalovchi',
    specialty: '3D loyihalash, SAPR/CAD texnik chizmalar, korpus va mexanik detallar, test sinovlari',
    whatCanDo: [
      '3D loyihalash va SAPR/CAD tizimlarida texnik chizmalar tayyorlash.',
      'Qurilma korpusi, detallari va mexanik qismlarini ishlab chiqish.',
      'Prototip mexanizmlari, ishlab chiqarish talablari va mexanik test sinovlarini o‘tkazish.'
    ],
    responsibilities: 'Konstruktorlik ishlari, 3D modellashtirish, texnik chizmalar va prototiplash.',
    keywords: [
      'muhammadali', 'turdiyev', 'konstruktor', '3d loyihalash', 'cad', 'chizma', 'korpus',
      'mexanik detallar', 'prototip', 'test sinovlari'
    ]
  },
  {
    id: 'staff-07',
    name: 'Abdullayeva Shaxlo',
    loginId: 'shaxlo_abdullayeva',
    role: 'CONSTRUCTOR / 3D_DESIGNER',
    position: 'Konstruktor, 3D loyihalovchi',
    specialty: '3D konstruksiyalar, texnik chizmalar, qurilma korpusi, montaj qulayligi va reviziyalar',
    whatCanDo: [
      'Konstruktorlik loyihalari, 3D modellar va texnik chizmalar tayyorlash.',
      'Qurilma korpusi, montaj qulayligi va texnik xizmat ko‘rsatish konstruktsiyasini ishlab chiqish.',
      '3D modellarni yangilash, reviziyalar va ishlab chiqarish parametrlarini nazorat qilish.'
    ],
    responsibilities: '3D modellar, texnik chizmalar, qurilma korpusi va montaj loyihalari.',
    keywords: [
      'shaxlo', 'abdullayeva', 'konstruktor', '3d model', 'texnik chizma', 'korpus',
      'montaj qulayligi', 'mexanika', 'reviziya'
    ]
  }
];

export function findMatchingTeamMembers(query: string): TeamMemberCapability[] {
  const q = query.toLocaleLowerCase('uz').trim();
  if (!q) return TEAM_MEMBERS_CAPABILITIES;

  const scored = TEAM_MEMBERS_CAPABILITIES.map(member => {
    let score = 0;
    const nameLower = member.name.toLocaleLowerCase('uz');
    const posLower = member.position.toLocaleLowerCase('uz');
    const specLower = member.specialty.toLocaleLowerCase('uz');

    if (nameLower.includes(q)) score += 5;
    if (posLower.includes(q)) score += 3;
    if (specLower.includes(q)) score += 2;

    for (const kw of member.keywords) {
      if (q.includes(kw)) score += 3;
      else if (kw.includes(q)) score += 1;
    }

    for (const item of member.whatCanDo) {
      const itemLower = item.toLocaleLowerCase('uz');
      const words = q.match(/[\p{L}\p{N}]{3,}/gu) || [];
      for (const w of words) {
        if (itemLower.includes(w)) score += 1;
      }
    }

    return { member, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).map(s => s.member);
}
