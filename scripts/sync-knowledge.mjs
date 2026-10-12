import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.resolve(process.env.LABCONTROL_DATABASE_FILE || './data/production.database.json');
if (!fs.existsSync(dbPath)) {
  console.log(`Database file not found at ${dbPath}`);
  process.exit(0);
}

const raw = fs.readFileSync(dbPath, 'utf-8');
const data = JSON.parse(raw);

const projectId = "proj-b91bb9d5-3142-459a-881b-a8d0157a2bf1";
const projectName = "Krim Assistent";
const ownerId = "staff-02";

const newKnowledgeItems = [
  {
    title: "Elektron brasletlar: UBQ-16 (oyoqqa) va UBQ-04 (qo‘lga) qurilmalari hamda masofaviy nazorat tizimi",
    category: "Hardware",
    content: "O‘zbekiston Respublikasi Vazirlar Mahkamasining 2024-yil 5-dekabrdagi 813-son qaroriga muvofiq, uy qamog‘i ehtiyot chorasi va ozodlikni cheklash jazosi tayinlangan shaxslarni elektron brasletlar orqali real vaqt rejimida masofadan nazorat qilish tartibi belgilangan.\n\n### Qurilma turlari va texnik parametrlari:\n1. **UBQ-16 (Oyoqqa taqiladigan universal boshqaruv qurilmasi):** 45 dona ishlab chiqarilgan. Asosiy ehtiyot chorasi bo‘lgan shaxslar uchun mo‘ljallangan, korpus zarbaga chidamli polikarbonatdan iborat, IP68 himoya darajasiga ega.\n2. **UBQ-04 (Qo‘lga taqiladigan universal boshqaruv qurilmasi):** 30 dona ishlab chiqarilgan. Kundalik taqishga qulay, teriga allergik ta’sir ko‘rsatmaydigan tibbiy silikon tasmali.\n\n### Sinovlarda aniqlangan kamchiliklar va bartaraf etish yechimlari:\n- **Quvvatlash kontaktlari:** Zaryadlash moslamasining kontakt elementlari mexanik yemirilishiga qarshi magnitli Pogo-pin ulagichlariga almashtiriladi.\n- **Tasma o‘lchamini moslashtirish:** Turli o‘lchamdagi oyoq va qo‘l to‘piqlariga mos keluvchi ko‘p pog‘onali tasmalar va optik uzilish sensorlari o‘rnatildi.\n- **Dasturiy ta’minot:** Institut mutaxassislari tomonidan to‘liq ishlab chiqilgan server dasturi geolokatsiyani, akkumulyator zaryadini va tasmaning uzilish/yechilish holatini har 30 soniyada markaziy serverga shifrlangan TLS kanali orqali yetkazadi.",
    technicalParams: [
      { key: "Himoya darajasi", value: "IP68 germetik" },
      { key: "Aloqa moduli", value: "4G LTE Cat-1 + 2G fallback" },
      { key: "Geolokatsiya", value: "GPS / GLONASS / LBS / Wi-Fi sniffing" },
      { key: "Batareya muddati", value: "Kamida 72 soat faol rejimda" }
    ],
    tags: ["Elektron braslet", "UBQ-16", "UBQ-04", "Probatsiya", "Hardware", "Nazorat"]
  },
  {
    title: "\"Aqlli ko‘zoynak\" tizimi: Face Recognition va ANPR texnologiyalari",
    category: "Research",
    content: "\"Aqlli ko‘zoynak\" mobil taqiladigan tizimi jamoat xavfsizligini ta’minlash va qidiruvdagi shaxslarni zudlik bilan aniqlash uchun mo‘ljallangan.\n\n### Asosiy vazifalari va ishlash mexanizmi:\n1. **Yuzni tanish (Face Recognition):** Ko‘zoynakka o‘rnatilgan mikro-kamera orqali olingan tasvir lokal neyrotarmoq embeddingiga aylantiriladi va qidiruvdagi shaxslar ma’lumotlar bazasi bilan real vaqtda solishtiriladi. O‘xshashlik 85% dan yuqori bo‘lganda xodimning mikro-displeyida shaxs ma’lumotlari chiqadi.\n2. **Davlat raqamlarini skanerlash (ANPR):** Yo‘llarda va avtoturargohlarda harakatlanayotgan avtomobillarning davlat raqam belgilarini avtomatik o‘qib, o‘g‘irlangan yoki qidiruvdagi transport vositalarini aniqlaydi.\n3. **Optik modul:** Ko‘zoynak ichidagi shaffof OLED prizma ekrani xodimning ko‘rish maydonini to‘smay, kerakli indikatorlarni chiqaradi.",
    technicalParams: [
      { key: "Kamera burchagi", value: "110 daraja keng burchakli, 1080p 30fps" },
      { key: "AI neyron tezlatkich", value: "1.2 TOPS NPU modul" },
      { key: "Javob vaqti", value: "< 400 ms (lokal bazada)" },
      { key: "Avtonom ishlash", value: "4-6 soat uzluksiz video tahlil" }
    ],
    tags: ["Aqlli ko‘zoynak", "Face Recognition", "ANPR", "AI", "Kamera", "Qidiruv"]
  },
  {
    title: "\"Xavfsiz sayohat\" telemetriya va transport monitoringi tizimi",
    category: "Specification",
    content: "\"Xavfsiz sayohat\" loyihasi sayyohlik transportlari va maxsus avtomashinalar harakatini xavfsiz boshqarish, tezlik va marshrutdan chetlanishlarni nazorat qilishga mo‘ljallangan.\n\n### Tizim imkoniyatlari:\n- **Avtomobil bort kompyuteri bilan integratsiya:** CAN-bus (J1939/OBD-II) interfeysi orqali yonilg‘i sarfi, motor harorati, tormoz tizimi va xavfsizlik kamarlarining holatini o‘qiydi.\n- **SOS favqulodda chaqiruv:** Haydovchi yoki yo‘lovchilar tomonidan tugma bosilganda zudlik bilan koordinatalar va avtomobil ichidagi audio signal navbatchilik qismiga uzatiladi.\n- **Avariyani aniqlash (Crash Detection):** 3 o‘qli akselerometr va giroskop yordamida to‘qnashuv, zarba yoki ag‘darilish holati millisekundlarda fiksatsiya qilinadi va avto-signal jo‘natiladi.",
    technicalParams: [
      { key: "CAN interfeysi", value: "CAN 2.0B / ISO 15765-4" },
      { key: "Akselerometr", value: "16-bit 3-axis I2C/SPI" },
      { key: "Aloqa protokoli", value: "MQTT over TLS / WebSocket" }
    ],
    tags: ["Xavfsiz sayohat", "Telemetriya", "CAN-bus", "GPS", "Monitoring", "Transport"]
  },
  {
    title: "Krim Assistent: Kriminologiya instituti sun’iy intellekt tahliliy platformasi",
    category: "Software",
    content: "«Krim Assistent» platformasi — Kriminologiya tadqiqot instituti xodimlarining ilmiy, tahliliy va tashkiliy faoliyatiga ko‘maklashuvchi ikkinchi miya (Second Brain) va korporativ AI yordamchisidir.\n\n### Funksional yo‘nalishlar:\n1. **Ichki hujjatlar bo‘yicha RAG qidiruv:** Institutning me’yoriy hujjatlari, hisobotlari va ilmiy maqolalarini semantik indekslash orqali aniq manba (sahifa, band) ko‘rsatilgan javoblar shakllantiriladi.\n2. **Hujjat loyihalarini avtomatlashtirish:** Rasmiy xatlar, bildirgilar, tahliliy ma’lumotnomalar va taqdimot matnlarini belgilangan davlat standarti shablonlari asosida tayyorlaydi.\n3. **Rolli kirish nazorati (RBAC):** Boshliq barcha laboratoriya ma’lumotlarini, Administrator texnik sozlamalarni, oddiy foydalanuvchi faqat o‘ziga tegishli loyiha va vazifalarni ko‘radi.\n4. **Ma’lumotlar xavfsizligi:** Maxfiy ma’lumotlar tashqi servislarga ruxsatsiz yuborilmaydi; lokal serverlarda qayta ishlanadi.",
    technicalParams: [
      { key: "Qidiruv arxitekturasi", value: "Hybrid Vector + BM25 Tokenizer" },
      { key: "Indekslash formatlari", value: "DOCX, PDF, PPTX, TXT" },
      { key: "Xavfsizlik darajasi", value: "RBAC 5-Level Data Isolation" }
    ],
    tags: ["Krim Assistent", "RAG", "AI", "Hujjatlar", "NLP", "Xavfsizlik"]
  },
  {
    title: "SolidWorks 3D modellashtirish va mexanik konstruksiya standartlari",
    category: "CAD/3D",
    content: "Laboratoriyada ishlab chiqilayotgan korpuslar va mexanik uzellar uchun SolidWorks tizimida loyihalash qoidalari:\n\n### Chizma va modellashtirish talablari:\n1. **Devor qalinligi (Wall Thickness):** 3D bosib chiqariladigan plastik korpuslar uchun minimal devor qalinligi 2.0–2.5 mm, metall detallar uchun 1.5–3.0 mm bo‘lishi lozim.\n2. **Qotirgich qovurg‘alar (Ribs):** Deformatsiyani oldini olish uchun yassi yuzalarga devor qalinligining 0.6 barobariga teng qovurg‘alar qo‘yiladi.\n3. **Germetiklik (IP67/IP68):** Rezina zichlagich kanali (O-Ring groove) chuqurligi silikon kordon diametrining 75% qismini tashkil qilishi va qisuvchi boltlar oralig‘i 30 mm dan oshmasligi kerak.\n4. **Materiallar tanlovi:** Tashqi korpuslar uchun UV nurlarga chidamli ABS/PETG, mexanik mustahkam karkaslar uchun D16T (duralyuminiy) qotishmasi ishlatiladi.",
    technicalParams: [
      { key: "3D printer aniqligi", value: "0.1 – 0.2 mm (FDM / SLA)" },
      { key: "CNC frezalash aniqligi", value: "±0.05 mm" },
      { key: "Standartlar", value: "GOST 2.109 / ISO 2768-m" }
    ],
    tags: ["SolidWorks", "CAD/3D", "Konstruksiya", "IP68", "CNC", "3D Printing"]
  },
  {
    title: "Mikrokontrollerlar (ESP32-S3, STM32) va datchiklar bilan ishlash reglamenti",
    category: "Hardware",
    content: "Laboratoriya elektronika loyihalarida mikrokontrollerlar bilan ishlash bo‘yicha texnik ko‘rsatmalar:\n\n### Interfeyslar va ulanish qoidalari:\n- **I2C shinasi:** Har bir SDA va SCL liniyasiga 3.3V dan 4.7 kOm pull-up rezistorlari qo‘yilishi shart. Shina uzunligi 30 sm dan oshganda PCA9615 differensial drayveri qo‘llaniladi.\n- **SPI shinasi:** Yuqori tezlikdagi sensorlar va displeylar uchun CS (Chip Select) alohida GPIO ga ulanadi, signal shovqinlarini kamaytirish uchun seriyali 33 Om damping rezistori tavsiya etiladi.\n- **RS-485 Modbus RTU:** Sanoat sharoitida MAX3485 drayveri ishlatiladi. Liniya uchlarida 120 Om terminatsiya rezistori bo‘lishi shart.\n- **Analog sensorlar (ADC):** ESP32 ichki ADC shovqinli bo‘lgani sababli, aniq o‘lchash talab qilinganda tashqi 16-bitli ADS1115 drayveri ishlatiladi va dasturiy o‘rtachalash (Moving Average) algoritmi qo‘llaniladi.",
    technicalParams: [
      { key: "Mantiqiy kuchlanish", value: "3.3V LVTTL" },
      { key: "RS-485 tezligi", value: "9600 – 115200 baud" },
      { key: "ADC o‘lchash aniqligi", value: "16-bit (ADS1115)" }
    ],
    tags: ["Mikrokontroller", "ESP32-S3", "STM32", "I2C", "SPI", "RS-485", "Modbus"]
  },
  {
    title: "Laboratoriya dasturiy ta’minot arxitekturasi va API xavfsizligi",
    category: "Software",
    content: "LabControl veb-ilovasi va server API xavfsizligi talablari:\n\n### Arxitektura tamoyillari:\n1. **Next.js & TypeScript:** Barcha server marshrutlari (API Routes) server darajasida ruxsatlarni (requirePermission) tekshiradi.\n2. **Argon2id Parol Shifrlash:** Foydalanuvchi parollari faqat kriptografik mustahkam Argon2id xeshlari ko‘rinishida saqlanadi.\n3. **RBAC va Ma’lumot Izolyatsiyasi:** Hech bir foydalanuvchi o‘ziga tegishli bo‘lmagan loyihalar, hisobotlar yoki boshqalarning shaxsiy chatlarini ko‘ra olmaydi.\n4. **Audit Jurnali:** Har qanday muhim amal (vazifa yaratish, holat o‘zgartirish, hujjat yuklash, xodim sozlamalari) avtomatik ravishda Audit logiga qayd etiladi.",
    technicalParams: [
      { key: "Framework", value: "Next.js 16 (App Router)" },
      { key: "Autentifikatsiya", value: "Argon2id + HTTP-only Cookie" },
      { key: "Xavfsizlik", value: "Strict CORS + CSRF Token + Rate Limit" }
    ],
    tags: ["Software", "Arxitektura", "Next.js", "API", "Xavfsizlik", "Argon2id"]
  },
  {
    title: "Ishlab chiqarish va prototiplashda texnika xavfsizligi hamda sinov protokollari (SOP)",
    category: "Standard",
    content: "Laboratoriya xodimlari uchun standart ish tartibi (Standard Operating Procedure - SOP) va texnika xavfsizligi:\n\n### Asosiy qoidalar:\n1. **Elektr xavfsizligi:** 36V dan yuqori kuchlanishli zanjirlar bilan ishlashda izolyatsiyalangan asboblar va antistatik bilaguzuklar (ESD wrist strap) qo‘llanilishi shart.\n2. **Akkumulyatorlar (Li-Ion / LiPo):** Litiy batareyalarni ortiqcha zaryadlash (overcharge) va qisqa tutashuvdan himoya qilish uchun BMS (Battery Management System) platasi bo‘lishi majburiy. Zaryadlash faqat o‘tga chidamli qutilarda amalga oshiriladi.\n3. **CNC va 3D dastgohlar:** Mexanik dastgohlar ishlayotgan paytda himoya ko‘zoynaklari taqilishi va ish joyi qarovsiz qoldirilmasligi shart.\n4. **Sinov dalolatnomasi:** Har bir tayyorlangan prototip sinovdan o‘tkazilib, sinov bayonnomasi (Test Report) mas’ul muhandis va laboratoriya boshlig‘i tomonidan imzolanadi.",
    technicalParams: [
      { key: "ESD himoya", value: "ANSI/ESD S20.20 standarti" },
      { key: "Batareya xavfsizligi", value: "IEC 62133 sertifikati" },
      { key: "Ish harorati", value: "+18°C dan +26°C gacha" }
    ],
    tags: ["Standart", "Texnika xavfsizligi", "SOP", "ESD", "Batareya", "Prototip"]
  }
];

if (!Array.isArray(data.knowledge)) {
  data.knowledge = [];
}

let addedCount = 0;
for (const item of newKnowledgeItems) {
  const exists = data.knowledge.some(k => k.title.toLowerCase() === item.title.toLowerCase());
  if (!exists) {
    data.knowledge.push({
      id: `kno-${randomUUID()}`,
      title: item.title,
      category: item.category,
      content: item.content,
      projectId,
      projectName,
      technicalParams: item.technicalParams,
      tags: item.tags,
      updatedAt: new Date().toISOString(),
      ownerId
    });
    addedCount++;
  }
}

if (addedCount > 0) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[SYNC] Qo'shildi: ${addedCount} ta yangi bilim yozuvi. Jami bilimlar: ${data.knowledge.length}`);
} else {
  console.log(`[SYNC] Barcha bilim yozuvlari allaqachon mavjud (${data.knowledge.length} ta).`);
}
