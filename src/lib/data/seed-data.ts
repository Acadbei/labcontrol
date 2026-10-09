import { User, Project, Task, DocumentEntity, DocumentChunk, KnowledgeItem, AuditLog, SystemSettings } from '@/types';

export const SEED_USERS: User[] = [
  {
    id: 'user-1',
    name: 'Demo rahbar',
    email: '',
    role: 'ADMIN',
    position: 'Laboratoriya boshlig‘i',
    permissions: []
  },
  {
    id: 'user-2',
    name: 'Demo texnik administrator',
    email: '',
    role: 'SUPER_ADMIN',
    position: 'Backend dasturchi',
    permissions: []
  },
  {
    id: 'user-3',
    name: 'Demo frontend xodimi',
    email: '',
    role: 'USER',
    position: 'Frontend dasturchi',
    permissions: []
  },
  {
    id: 'user-4',
    name: 'Demo dasturchi',
    email: '',
    role: 'USER',
    position: 'Umumiy dasturchi',
    permissions: []
  },
  {
    id: 'user-5',
    name: 'Demo konstruktor 1',
    email: '',
    role: 'USER',
    position: 'Konstruktor, 3D loyihalovchi',
    permissions: []
  },
  {
    id: 'user-6',
    name: 'Demo konstruktor 2',
    email: '',
    role: 'USER',
    position: 'Konstruktor, 3D loyihalovchi',
    permissions: []
  },
  {
    id: 'user-7',
    name: 'Demo konstruktor 3',
    email: '',
    role: 'USER',
    position: 'Konstruktor, 3D loyihalovchi',
    permissions: []
  }
];

export const SEED_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: 'Smart Water Meter',
    code: 'SWM-2026',
    description: 'Sanoat va aholi uchun mo‘ljallangan, ultra-past quvvatli ESP32-S3 mikrokontrolleri va yuqori aniqlikdagi suv bosimi sensori bilan jihozlangan aqlli suv hisoblagich qurilmasi.',
    status: 'Active',
    priority: 'Critical',
    startDate: '2026-02-01',
    deadline: '2026-11-30',
    managerId: 'user-1',
    teamIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5', 'user-6'],
    documentsCount: 4,
    tasksCount: 8,
    progressPercent: 68,
    technicalParameters: [
      { key: 'Mikrokontroller', value: 'ESP32-S3 Dual-Core Xtensa LX7', unit: '240 MHz', category: 'Hardware' },
      { key: 'Bosim o‘lchash diapazoni', value: '0 – 1.6', unit: 'MPa', category: 'Sensor' },
      { key: 'O‘lchash xatoligi', value: '±0.5%', unit: '%', category: 'Accuracy' },
      { key: 'Aloqa interfeysi', value: 'NB-IoT / LoRaWAN (868 MHz)', category: 'Wireless' },
      { key: 'Batareya quvvati', value: 'LiSOCl2 3.6V 8500mAh (10 yil xizmat muddati)', category: 'Power' },
      { key: 'Himoya klassi', value: 'IP68 germetik korpus', category: 'Mechanics' }
    ],
    overview: 'Loyiha sanoat suv taqsimot tarmoqlarida bosim va sarfni real vaqtda monitoring qilish imkonini beradi.',
    decisions: [
      { id: 'dec-1', title: 'ESP32-S3 chipini tanlash tasdiqlandi (Wi-Fi/BLE + Deep Sleep 15uA)', date: '2026-02-15', decidedBy: 'Demo rahbar' },
      { id: 'dec-2', title: 'Bosim sensori sifatida keramika piezorezistiv 0-1.6 MPa datchigi qabul qilindi', date: '2026-03-02', decidedBy: 'Demo texnik administrator' }
    ],
    tags: ['ESP32-S3', 'IoT', 'Bosim sensori', 'Suv taqsimoti', 'IP68'],
    createdAt: '2026-02-01T10:00:00Z',
    updatedAt: '2026-10-05T14:30:00Z'
  },
  {
    id: 'proj-2',
    name: 'Avtonom Mobil Robot (AMR)',
    code: 'AMR-X1',
    description: 'Laboratoriya va ishlab chiqarish sexlari uchun avtonom logistika va material tashuvchi mobil robot platformasi.',
    status: 'Active',
    priority: 'High',
    startDate: '2026-03-10',
    deadline: '2026-12-15',
    managerId: 'user-1',
    teamIds: ['user-2', 'user-4', 'user-5', 'user-6', 'user-7'],
    documentsCount: 3,
    tasksCount: 6,
    progressPercent: 45,
    technicalParameters: [
      { key: 'Yuk ko‘tarish quvvati', value: '120', unit: 'kg', category: 'Mechanics' },
      { key: 'Harakat tezligi', value: '1.5', unit: 'm/s', category: 'Motion' },
      { key: 'Navigatsiya', value: '2D LiDAR SLAM + 3D Depth Camera', category: 'AI/Nav' },
      { key: 'Drayver va motorlar', value: '2x 24V 250W Brushless DC (BLDC) g‘ildirak drayveri', category: 'Hardware' },
      { key: 'Akkumulyator', value: 'LiFePO4 24V 40Ah', category: 'Power' }
    ],
    overview: 'AMR-X1 roboti sexlararo detallar va butlovchi qismlarni operator aralashuvisiz xavfsiz tashishga xizmat qiladi.',
    decisions: [
      { id: 'dec-3', title: 'Shassi alyuminiy profil asosida yengillashtirilgan qilib loyihalansin', date: '2026-03-25', decidedBy: 'Demo konstruktor 1' }
    ],
    tags: ['AMR', 'Robototexnika', 'LiDAR', 'SLAM', 'BLDC'],
    createdAt: '2026-03-10T09:00:00Z',
    updatedAt: '2026-10-04T16:00:00Z'
  },
  {
    id: 'proj-3',
    name: 'Spektrometr Optik Boshqaruv Bloki',
    code: 'SPEC-OPT-3',
    description: 'Yuqori aniqlikdagi laboratoriya spektral tahlil uskunasi uchun lazerli to‘lqin uzunligi kalibrlash va diffraksiya panjarasini boshqarish moduli.',
    status: 'Testing',
    priority: 'Medium',
    startDate: '2026-01-15',
    deadline: '2026-10-30',
    managerId: 'user-1',
    teamIds: ['user-2', 'user-4', 'user-7'],
    documentsCount: 2,
    tasksCount: 4,
    progressPercent: 88,
    technicalParameters: [
      { key: 'To‘lqin uzunligi diapazoni', value: '200 – 1100', unit: 'nm', category: 'Optics' },
      { key: 'Spektral ajratish qobiliyati', value: '0.1', unit: 'nm', category: 'Optics' },
      { key: 'Diffraksiya panjarasi', value: '1200', unit: 'shtrix/mm', category: 'Optics' },
      { key: 'Protsessor', value: 'STM32F407VGT6 ARM Cortex-M4', unit: '168 MHz', category: 'Hardware' }
    ],
    overview: 'Spektrometr kimyoviy elementlar tarkibini yuqori aniqlikda tahlil qilish uchun sinovdan o‘tkazilmoqda.',
    decisions: [
      { id: 'dec-4', title: 'Optik korpus anodlangan qora alyuminiy D16T materialidan tayyorlanishi tasdiqlandi', date: '2026-02-20', decidedBy: 'Demo konstruktor 3' }
    ],
    tags: ['Spektrometr', 'Optika', 'STM32', 'Lazer', 'Kalibrlash'],
    createdAt: '2026-01-15T08:30:00Z',
    updatedAt: '2026-10-02T11:00:00Z'
  },
  {
    id: 'proj-4',
    name: 'Sanoat Telemetriya va Datchiklar Tarmog‘i',
    code: 'InduSense-485',
    description: 'Sanoat ob’ektlari va laboratoriya stendlari uchun RS-485 Modbus RTU asosidagi opto-izolyatsiyalangan datchiklar telemetriya tarmog‘i.',
    status: 'Active',
    priority: 'High',
    startDate: '2026-04-01',
    deadline: '2026-11-20',
    managerId: 'user-1',
    teamIds: ['user-2', 'user-3', 'user-4'],
    documentsCount: 2,
    tasksCount: 4,
    progressPercent: 60,
    technicalParameters: [
      { key: 'Aloqa protokoli', value: 'RS-485 Modbus RTU (115200 baud)', category: 'Communication' },
      { key: 'Harorat datchigi', value: 'PT100 3-simli (-50 °C dan +300 °C gacha)', category: 'Sensor' },
      { key: 'Analog signal', value: '4 – 20 mA oqim sirtmog‘i (Current Loop)', category: 'Sensor' },
      { key: 'Galvanik izolyatsiya', value: '2.5 kV opto-izolyatsiya', category: 'Safety' },
      { key: 'Ta’minot kuchlanishi', value: '12 – 24 V DC', category: 'Power' }
    ],
    overview: 'Ushbu loyiha barcha sanoat datchiklaridan olingan analog va raqamli signallarni markaziy LabControl serveriga uzatadi.',
    decisions: [
      { id: 'dec-5', title: 'RS-485 magistralida 120 Om terminatsiya qarshiligi o‘rnatilishi shart deb belgilandi', date: '2026-04-10', decidedBy: 'Demo dasturchi' }
    ],
    tags: ['RS-485', 'Modbus RTU', 'PT100', '4-20mA', 'Telemetriya'],
    createdAt: '2026-04-01T09:00:00Z',
    updatedAt: '2026-10-05T12:00:00Z'
  }
];

export const SEED_DOCUMENTS: DocumentEntity[] = [
  {
    id: 'doc-1',
    title: 'Smart Water Meter — Texnik Shartlari va Sinov Bayonnomasi',
    originalName: 'Smart_Water_Meter_Technical_Specification.pdf',
    fileType: 'pdf',
    fileSize: 2450000,
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    uploadedById: 'user-2',
    uploadedByName: 'Demo texnik administrator',
    uploadedAt: '2026-09-15T10:20:00Z',
    version: 1,
    summary: 'Suv hisoblagichining to‘liq texnik parametrlari, ESP32-S3 mikrokontrollerining sxemasi, bosim sensori (0-1.6 MPa) va batareya muddati hisob-kitoblari.',
    tags: ['ESP32-S3', 'Bosim sensori', '0-1.6 MPa', 'IP68', 'NB-IoT'],
    pageCount: 24,
    wordCount: 4850,
    isIndexed: true,
    chunksCount: 8,
    technicalParameters: [
      { key: 'Sensor o‘lchash diapazoni', value: '0 – 1.6 MPa', sourceDocId: 'doc-1' },
      { key: 'Asosiy kontroller', value: 'ESP32-S3-WROOM-1', sourceDocId: 'doc-1' },
      { key: 'Quvvat manbai', value: 'LiSOCl2 3.6V ER26500', sourceDocId: 'doc-1' },
      { key: 'Himoya darajasi', value: 'IP68 (Suv ostida 2 metr 72 soat)', sourceDocId: 'doc-1' }
    ]
  },
  {
    id: 'doc-2',
    title: 'AMR Mobil Robot — Mexanik va Kinematik Tahlil',
    originalName: 'AMR_Robot_Kinematik_Tahlil.docx',
    fileType: 'docx',
    fileSize: 1840000,
    projectId: 'proj-2',
    projectName: 'Avtonom Mobil Robot (AMR)',
    uploadedById: 'user-5',
    uploadedByName: 'Demo konstruktor 1',
    uploadedAt: '2026-09-20T14:10:00Z',
    version: 2,
    summary: 'Robot shassisi chizmalari, 2 ta BLDC 24V motor va g‘ildirak drayverlari mexanik yuklama hisob-kitoblari, og‘irlik markazi va ag‘darilish turg‘unligi.',
    tags: ['Mexanika', 'Kinematika', 'BLDC 24V', 'Shassi', 'SolidWorks'],
    pageCount: 16,
    wordCount: 3200,
    isIndexed: true,
    chunksCount: 6,
    technicalParameters: [
      { key: 'Maksimal foydali yuk', value: '120 kg', sourceDocId: 'doc-2' },
      { key: 'G‘ildirak diametri', value: '150 mm poliuretan', sourceDocId: 'doc-2' },
      { key: 'Nominal tezlik', value: '1.2 m/s (maks 1.5 m/s)', sourceDocId: 'doc-2' }
    ]
  },
  {
    id: 'doc-3',
    title: 'Spektrometr Optik Kalibrlash — Laboratoriya Taqdimoti',
    originalName: 'Optik_Spektrometr_Kalibrlash_Qollanma.pptx',
    fileType: 'pptx',
    fileSize: 3120000,
    projectId: 'proj-3',
    projectName: 'Spektrometr Optik Boshqaruv Bloki',
    uploadedById: 'user-7',
    uploadedByName: 'Demo konstruktor 3',
    uploadedAt: '2026-09-28T16:45:00Z',
    version: 1,
    summary: 'Diffraksiya panjarasi burchagini sozlash algoritmi, geliy-neon lazeri (632.8 nm) yordamida to‘lqin uzunligini birlamchi kalibrlash slaydlari.',
    tags: ['Optika', 'Lazer 632.8nm', 'Diffraksiya', 'STM32', 'Kalibrlash'],
    slideCount: 18,
    wordCount: 2100,
    isIndexed: true,
    chunksCount: 5,
    technicalParameters: [
      { key: 'Kalibrlash manbai', value: 'He-Ne Laser 632.8 nm', sourceDocId: 'doc-3' },
      { key: 'Panjara zichligi', value: '1200 shtrix/mm', sourceDocId: 'doc-3' }
    ]
  },
  {
    id: 'doc-4',
    title: 'InduSense-485 Sanoat Telemetriya va Modbus RTU Standarti',
    originalName: 'InduSense_Modbus_RTU_Standard.pdf',
    fileType: 'pdf',
    fileSize: 1950000,
    projectId: 'proj-4',
    projectName: 'Sanoat Telemetriya va Datchiklar Tarmog‘i',
    uploadedById: 'user-2',
    uploadedByName: 'Demo texnik administrator',
    uploadedAt: '2026-10-01T11:00:00Z',
    version: 1,
    summary: 'RS-485 sanoat shinasida Modbus RTU protokoli orqali PT100 harorat datchigi va 4-20mA datchiklarini so‘rov qilish registrlari xaritasi va 2.5 kV galvanik izolyatsiya sxemasi.',
    tags: ['RS-485', 'Modbus RTU', 'PT100', '4-20mA', 'Telemetriya'],
    pageCount: 18,
    wordCount: 3800,
    isIndexed: true,
    chunksCount: 4,
    technicalParameters: [
      { key: 'Standart baudrate', value: '115200 bps 8N1', sourceDocId: 'doc-4' },
      { key: 'Harorat diapazoni', value: '-50 °C dan +300 °C gacha', sourceDocId: 'doc-4' },
      { key: 'Kirish izolyatsiyasi', value: '2.5 kV optik ajratish', sourceDocId: 'doc-4' }
    ]
  }
];

export const SEED_CHUNKS: DocumentChunk[] = [
  {
    id: 'chk-1',
    docId: 'doc-1',
    chunkIndex: 0,
    pageOrSlide: 4,
    sectionTitle: '2. Texnik Parametrlar va Datchik Tizimi',
    text: 'Smart Water Meter suv hisoblagichi sanoat va maishiy suv taqsimot tizimlarida bosim va sarfni aniq monitoring qilish uchun mo‘ljallangan. Tizimda asosiy bosim sensori sifatida yuqori aniqlikdagi keramika piezorezistiv datchik o‘rnatilgan. Sensorning o‘lchash diapazoni: 0 – 1.6 MPa (0 dan 16 bar gacha). O‘lchov xatoligi butun diapazon bo‘ylab ±0.5% dan oshmaydi.'
  },
  {
    id: 'doc-1-chk-2',
    docId: 'doc-1',
    chunkIndex: 1,
    pageOrSlide: 12,
    sectionTitle: '4. Mikrokontroller va Quvvat Boshqaruvi',
    text: 'Tizim markaziy hisoblash moduli sifatida Espressif Systems kompaniyasining ESP32-S3 mikrokontrolleridan foydalanadi (Dual-Core Xtensa LX7, 240 MHz). ESP32-S3 chipi apparat darajasida AES-256 va RSA kriptografik xavfsizlikni qo‘llab-quvvatlaydi. Quvvat tejash rejimida (Deep Sleep) iste’mol oqimi 15 uA ni tashkil etadi. Datchik o‘lchovlari har 15 daqiqada bir marta olinadi va NB-IoT orqali serverga uzatiladi.'
  },
  {
    id: 'doc-1-chk-3',
    docId: 'doc-1',
    chunkIndex: 2,
    pageOrSlide: 14,
    sectionTitle: '5. Korpus va Atrof-muhit Chidamliligi',
    text: 'Smart Water Meter korpusi mustahkam polikarbonat va zanglamaydigan po‘lat (AISI 316) qotishmasidan tayyorlangan. Korpus himoya darajasi IP68 xalqaro standartiga to‘liq javob beradi va 2 metr suv tubida 72 soat davomida suv kirmaslik xususiyatini kafolatlaydi. Ishchi harorat oralig‘i -20 °C dan +65 °C gacha.'
  },
  {
    id: 'doc-2-chk-1',
    docId: 'doc-2',
    chunkIndex: 0,
    pageOrSlide: 3,
    sectionTitle: '1. Mexanik Shassi va Harakat Tizimi',
    text: 'AMR-X1 mobil roboti differensial boshqaruv tizimiga ega. Harakatlantiruvchi kuch sifatida 2 ta cho‘tkasiz o‘zgarmas tok motori (BLDC 24V 250W) va planetar reduktor (nisbati 1:15) qo‘llanilgan. G‘ildiraklar yuqori chidamlilikdagi poliuretan materialidan yasalgan, diametri 150 mm. Robotning maksimal harakatlanish tezligi 1.5 m/s bo‘lib, to‘la yuk bilan (120 kg) tezlik 1.0 m/s ni tashkil qiladi.'
  },
  {
    id: 'doc-2-chk-2',
    docId: 'doc-2',
    chunkIndex: 1,
    pageOrSlide: 8,
    sectionTitle: '3. Quvvat va Batareya Boshqaruv Tizimi (BMS)',
    text: 'Robot mustaqil ishlash davomiyligini ta’minlash maqsadida LiFePO4 (litiy-temir-fosfat) 24V 40Ah akkumulyator bloki bilan ta’minlangan. Batareya to‘liq zaryad bilan 8 soat uzluksiz avtonom patrul va yuk tashish rejimida ishlay oladi. Zaryad darajasi 15% dan pasayganda robot avtomatik ravishda dok-stansiyaga yo‘l oladi.'
  },
  {
    id: 'doc-3-chk-1',
    docId: 'doc-3',
    chunkIndex: 0,
    pageOrSlide: 5,
    sectionTitle: 'Slayd 5: Lazer Kalibrlash Prinsiplari',
    text: 'Optik spektrometrning to‘lqin uzunligi shkalasini aniq kalibrlash uchun Geliy-Neon (He-Ne) lazeri (to‘lqin uzunligi 632.816 nm) qo‘llaniladi. Diffraksiya panjarasi 1200 shtrix/mm zichlikka ega bo‘lib, qadam motori (step motor) orqali 0.005 gradus aniqlikda buriladi. STM32F4 mikrokontrolleri orqali o‘lchash signallari ADC ga qabul qilinadi va matematik approksimatsiya orqali spektr tiklanadi.'
  },
  {
    id: 'doc-4-chk-1',
    docId: 'doc-4',
    chunkIndex: 0,
    pageOrSlide: 4,
    sectionTitle: '2. Modbus RTU Registrlar Xaritasi',
    text: 'InduSense-485 tizimida harorat ko‘rsatkichlari Input Registers 30001 (PT100 Channel 1) va 30002 (PT100 Channel 2) manzillarida 16-bitli butun son ko‘rinishida saqlanadi (Qiymat 10 ga bo‘linganda Haqiqiy Selsiy darajasi olinadi). 4-20 mA sanoat bosim datchigi 30005 registrida saqlanadi. RS-485 liniyasida 2.5 kV optik galvanik ajratish ADuM1401 mikrosxemasi orqali ta’minlangan.'
  }
];

export const SEED_TASKS: Task[] = [
  {
    id: 'task-1',
    title: 'ESP32-S3 Deep Sleep va NB-IoT ma’lumot uzatish taymerini sozlash',
    description: 'Mikrokontroller quvvat tejash rejimida 15uA iste’mol qilishi uchun barcha periferiya modullarini (ADC, SPI, GPIO) to‘g‘ri o‘chirish ketma-ketligini yozish.',
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    assigneeId: 'user-4',
    assigneeName: 'Demo dasturchi',
    creatorId: 'user-1',
    creatorName: 'Demo rahbar',
    priority: 'Critical',
    deadline: '2026-10-12',
    status: 'IN_PROGRESS',
    aiSummary: 'ESP32-S3 chuqur uyqu rejimi va batareya muddati 10 yilga yetishi uchun dasturiy optimallashtirish.',
    comments: [
      { id: 'c-1', userId: 'user-4', userName: 'Demo dasturchi', text: 'Firmware prototipida ADC o‘chirish sinovdan o‘tdi, oqim 18uA ga tushdi.', createdAt: '2026-10-04T11:00:00Z' }
    ],
    tags: ['Firmware', 'ESP32-S3', 'Power'],
    createdAt: '2026-10-01T09:00:00Z',
    updatedAt: '2026-10-04T11:00:00Z'
  },
  {
    id: 'task-2',
    title: 'Smart Water Meter IP68 korpusini SolidWorksda 3D modelini yakunlash',
    description: '0-1.6 MPa datchik ulagichi uchun silikon zichlagich o‘rni va zanglamaydigan po‘lat flanes chizmalarini tayyorlash.',
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    assigneeId: 'user-5',
    assigneeName: 'Demo konstruktor 1',
    creatorId: 'user-1',
    creatorName: 'Demo rahbar',
    priority: 'High',
    deadline: '2026-10-15',
    status: 'IN_PROGRESS',
    aiSummary: 'IP68 germetiklik sinovlari uchun korpusning 3D modeli va montaj chizmasi.',
    comments: [],
    tags: ['CAD', 'SolidWorks', 'IP68', '3D'],
    createdAt: '2026-10-02T10:00:00Z',
    updatedAt: '2026-10-03T15:00:00Z'
  },
  {
    id: 'task-3',
    title: 'CNC dastgohida robot shassisi taglik qismini frezalash',
    description: 'AMR-X1 roboti uchun D16T alyuminiy plastinadan motor va reduktor o‘rnatiladigan tayanch plitalarini tayyorlash.',
    projectId: 'proj-2',
    projectName: 'Avtonom Mobil Robot (AMR)',
    assigneeId: 'user-6',
    assigneeName: 'Demo konstruktor 2',
    creatorId: 'user-2',
    creatorName: 'Demo texnik administrator',
    priority: 'High',
    deadline: '2026-10-18',
    status: 'TODO',
    aiSummary: '120 kg yuk ko‘taruvchi robot shassisi detallarini CNC da ishlab chiqarish.',
    comments: [],
    tags: ['CNC', 'Ishlab chiqarish', 'Alyuminiy', 'AMR'],
    createdAt: '2026-10-03T14:00:00Z',
    updatedAt: '2026-10-03T14:00:00Z'
  },
  {
    id: 'task-4',
    title: 'Laboratoriya telemetriya dashboard frontend interfeysini ishlab chiqish',
    description: 'Smart Water Meter va boshqa qurilmalardan kelayotgan bosim va oqim grafigini real vaqt rejimida chizuvchi komponent tayyorlash.',
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    assigneeId: 'user-3',
    assigneeName: 'Demo frontend xodimi',
    creatorId: 'user-2',
    creatorName: 'Demo texnik administrator',
    priority: 'Medium',
    deadline: '2026-10-20',
    status: 'IN_PROGRESS',
    aiSummary: 'Next.js va Tailwind asosida telemetriya grafiklari va sensor ko‘rsatkichlari UI bloki.',
    comments: [],
    tags: ['Frontend', 'Next.js', 'Charts', 'UI'],
    createdAt: '2026-10-02T16:00:00Z',
    updatedAt: '2026-10-04T12:00:00Z'
  },
  {
    id: 'task-5',
    title: 'Spektrometr to‘lqin uzunligi xatolik tahlili hisoboti',
    description: '632.8 nm He-Ne lazeri bilan o‘tkazilgan 50 ta sinov natijalarini matematik statistik tahlil qilish va chetlanishlarni aniqlash.',
    projectId: 'proj-3',
    projectName: 'Spektrometr Optik Boshqaruv Bloki',
    assigneeId: 'user-7',
    assigneeName: 'Demo konstruktor 3',
    creatorId: 'user-1',
    creatorName: 'Demo rahbar',
    priority: 'Medium',
    deadline: '2026-10-10',
    status: 'REVIEW',
    aiSummary: '0.1 nm spektral aniqlik bo‘yicha eksperimental ma’lumotlarni tahlil qilish.',
    comments: [],
    tags: ['Tahlil', 'Hisobot', 'Optika', 'Statistika'],
    createdAt: '2026-09-29T11:00:00Z',
    updatedAt: '2026-10-05T09:30:00Z'
  },
  {
    id: 'task-6',
    title: 'PostgreSQL va Qdrant uchun Docker Compose skriptini optimallashtirish',
    description: 'Laboratoriya serverida xotira cheklovlari va disk avtomatik backup jarayonlarini sozlash.',
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    assigneeId: 'user-2',
    assigneeName: 'Demo texnik administrator',
    creatorId: 'user-1',
    creatorName: 'Demo rahbar',
    priority: 'High',
    deadline: '2026-10-08',
    status: 'DONE',
    aiSummary: 'Local AI RAG va ma’lumotlar bazasi infratuzilmasi muvaffaqiyatli ishga tushirildi.',
    comments: [],
    tags: ['DevOps', 'Docker', 'PostgreSQL', 'Qdrant'],
    createdAt: '2026-09-25T10:00:00Z',
    updatedAt: '2026-10-02T18:00:00Z'
  }
];

export const SEED_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: 'kno-1',
    title: 'Suv bosimi sensorlari va standart diapazonlar',
    category: 'Hardware',
    content: 'Laboratoriyada suv taqsimot va bosim datchiklari bo‘yicha asosiy standart ishchi diapazon 0 dan 1.6 MPa (16 bar) deb belgilangan. Keramika piezorezistiv elementlar namlik va agressiv muhitga yuqori chidamli.',
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    technicalParams: [
      { key: 'Bosim diapazoni', value: '0 – 1.6 MPa' },
      { key: 'Maksimal buzilmaslik bosimi', value: '3.0 MPa' }
    ],
    tags: ['Bosim sensori', 'Sensor', '0-1.6 MPa'],
    updatedAt: '2026-09-18T10:00:00Z'
  },
  {
    id: 'kno-2',
    title: 'ESP32-S3 mikrokontrollerining Deep Sleep protokoli',
    category: 'Software',
    content: 'ESP32-S3 mikrokontrollerida quvvatni 15 mikroampergacha kamaytirish uchun RTC kontrolleridan foydalaniladi. Wi-Fi va BLE modullari avtomatik o‘chiriladi va faqat ULP (Ultra-Low Power) koprotsessor orqali vaqti-vaqti bilan uyg‘otiladi.',
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    technicalParams: [
      { key: 'Iste’mol oqimi (Sleep)', value: '15 uA' },
      { key: 'Chastota', value: '240 MHz' }
    ],
    tags: ['ESP32-S3', 'Deep Sleep', 'Firmware', 'RTC'],
    updatedAt: '2026-09-22T14:00:00Z'
  },
  {
    id: 'kno-3',
    title: 'SolidWorks chizmalarida IP68 standartini ta’minlash qoidalari',
    category: 'CAD/3D',
    content: 'IP68 korpuslarda rezina va silikon qistirmalar (O-Ring) uchun yivlar (groove) eni O-Ring diametrining 1.3 barobariga, chuqurligi esa 0.75 barobariga teng qilib loyihalanadi. Boltlarning birikish oraliqlari 35 mm dan oshmasligi shart.',
    projectId: 'proj-1',
    projectName: 'Smart Water Meter',
    technicalParams: [
      { key: 'O-Ring siqilish darajasi', value: '25%' },
      { key: 'Boltlar oralig‘i', value: '< 35 mm' }
    ],
    tags: ['IP68', 'SolidWorks', 'CAD', 'O-Ring'],
    updatedAt: '2026-09-25T11:30:00Z'
  }
];

export const SEED_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userId: 'user-2',
    userName: 'Demo texnik administrator',
    action: 'HUJJAT YUKLANDI',
    object: 'Smart_Water_Meter_Technical_Specification.pdf',
    details: '24 sahifalik PDF tahlil qilindi, 8 ta RAG chunk indekslandi va 4 ta texnik parametr ajratib olindi.',
    ip: '192.168.1.15',
    timestamp: '2026-10-06T09:42:15+05:00',
    status: 'SUCCESS'
  },
  {
    id: 'log-2',
    userId: 'user-1',
    userName: 'Demo rahbar',
    action: 'LOYIHA TEKSHIRILDI',
    object: 'Smart Water Meter',
    details: 'Boshqaruvchi tomonidan loyihaning texnik holati va muddati ko‘rib chiqildi.',
    ip: '192.168.1.10',
    timestamp: '2026-10-06T09:15:30+05:00',
    status: 'SUCCESS'
  },
  {
    id: 'log-3',
    userId: 'user-5',
    userName: 'Demo konstruktor 1',
    action: 'VAZIFA YANGILANDI',
    object: 'Task #2: IP68 korpus 3D modeli',
    details: 'SolidWorks montaj fayli v2 holatiga yangilandi.',
    ip: '192.168.1.22',
    timestamp: '2026-10-05T17:20:00+05:00',
    status: 'SUCCESS'
  },
  {
    id: 'log-4',
    userId: 'user-4',
    userName: 'Demo dasturchi',
    action: 'AI TAHLIL SO‘ROVI',
    object: 'LabControl Yordamchi',
    details: 'ESP32-S3 ning Deep Sleep rejimida quvvat sarfi va hisob-kitoblari so‘raldi.',
    ip: '192.168.1.19',
    timestamp: '2026-10-05T14:10:45+05:00',
    status: 'SUCCESS'
  }
];

export const DEFAULT_SETTINGS: SystemSettings = {
  aiProvider: 'ollama',
  ollamaUrl: 'http://localhost:11434',
  modelName: 'qwen2.5:7b',
  laboratoryName: 'Ishlab chiqarish laboratoriyasi',
  secondBrainTitle: 'LabControl — sinov muhiti'
};
