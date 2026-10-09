# 🔬 LabControl — Ubuntu Serverda Ishga Tushirish Qo‘llanmasi (Qadamma-qadam)

Ushbu qo‘llanma **LabControl** loyihasini noldan boshlab **Ubuntu Server**da (20.04 / 22.04 / 24.04) oson va tushunarli tarzda ishga tushirish uchun yozilgan.

---

## 📋 Mundarija
1. [Kerakli talablar](#1-kerakli-talablar)
2. [1-qadam: Serverni yangilash va kerakli dasturlarni o‘rnatish](#2-1-qadam-serverni-yangilash)
3. [2-qadam: Node.js va npm o‘rnatish](#3-2-qadam-nodejs-ornatish)
4. [3-qadam: Loyihani GitHub’dan yuklab olish](#4-3-qadam-loyihani-yuklab-olish)
5. [4-qadam: Kutubxonalarni (Dependencies) o‘rnatish](#5-4-qadam-kutubxonalarni-ornatish)
6. [5-qadam: Muhit sozlamalarini (.env) to‘g‘rilash](#6-5-qadam-env-faylini-sozlash)
7. [6-qadam: Loyihani yig‘ish (Build qilish)](#7-6-qadam-build-qilish)
8. [7-qadam: PM2 yordamida doimiy (fon rejimida) ishga tushirish](#8-7-qadam-pm2-bilan-ishga-tushirish)
9. [8-qadam: Miyya.uz domeniga ulash (Cloudflare Tunnel yoki Nginx)](#9-8-qadam-domen-va-tunnel-sozlash)
10. [Muammolar va ularning yechimlari](#10-muammolar-va-yechimlari)

---

## 1. Kerakli talablar

* **Operatsion tizim:** Ubuntu 20.04 LTS yoki undan yuqori
* **RAM:** Kamida 1 GB (2 GB tavsiya etiladi)
* **SSH orqali kirish:** Serveringizga kirish huquqi (`ssh maqsud@192.168.40.49` yoki o‘zingizning serveringiz)

---

## 2. 1-qadam: Serverni yangilash

Serveringizga SSH orqali kiring va tizimni yangilang:

```bash
sudo apt update && sudo apt upgrade -y
```

Keyin loyihaga kerak bo‘ladigan asosiy yordamchi dasturlarni o‘rnating:

```bash
sudo apt install -y curl git build-essential ufw
```

> **Tushuntirish:**
> - `curl` — internetdan fayl yuklab olish uchun.
> - `git` — GitHub’dan kodlarni yuklab olish uchun.
> - `build-essential` — parollarni shifrlaydigan `argon2` kabi kutubxonalarni serverda to‘g‘ri kompilyatsiya qilish uchun.

---

## 3. 2-qadam: Node.js o‘rnatish (Node.js 20 LTS)

LabControl Next.js asosida qurilgan, shuning uchun serverda **Node.js 20** bo‘lishi lozim:

```bash
# NodeSource omborini qo‘shish
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js va npm ni o‘rnatish
sudo apt install -y nodejs
```

Tekshirib ko‘ring:
```bash
node -v   # Masalan: v20.x.x chiqishi kerak
npm -v    # Masalan: 10.x.x chiqishi kerak
```

---

## 4. 3-qadam: Loyihani GitHub’dan yuklab olish

Serverda loyihani saqlaydigan papkaga o‘ting va GitHub repozitoriyingizdan klonlang:

```bash
# Uy papkasiga o‘tamiz
cd ~

# Agar papka bo‘lmasa:
mkdir -p lab_control
cd lab_control

# Loyihani yuklab olish
git clone https://github.com/Acadbei/labcontrol.git .
```

> **Eslatma:** Agar nuqta (`.`) qo‘ysangiz, fayllar to‘g‘ridan-to‘g‘ri `lab_control` papkasining ichiga tushadi.

---

## 5. 4-qadam: Kutubxonalarni (Dependencies) o‘rnatish

Loyiha papkasida turib, barcha paketlarni o‘rnating:

```bash
npm install
```

*(Kutubxonalar yuklanishi server tezligiga qarab 1-3 daqiqa vaqt olishi mumkin)*

---

## 6. 5-qadam: .env faylini sozlash

Namuna konfiguratsiyadan haqiqiy `.env` faylini nusxalang:

```bash
cp .env.example .env
```

Endi uni tahrirlash uchun oching:

```bash
nano .env
```

Fayl ichidagi asosiy qatorlarni tekshiring:
```env
NODE_ENV=production
PORT=3000
LABCONTROL_DEMO_MODE=false

LABCONTROL_PUBLIC_ORIGIN=https://miyya.uz
LABCONTROL_ALLOWED_ORIGINS=http://localhost:3000,http://192.168.40.75,https://miyya.uz,https://www.miyya.uz

# Ma'lumotlar saqlanadigan yo‘llar
LABCONTROL_DATABASE_FILE=./data/production.database.json
LABCONTROL_SESSION_FILE=./data/sessions.json
LABCONTROL_UPLOADS_DIR=./data/uploads
```

Saqlash uchun: `Ctrl + O`, so‘ng `Enter`. Chiqish uchun: `Ctrl + X`.

---

## 7. 6-qadam: Loyihani yig‘ish (Build qilish)

Production muhiti uchun Next.js ilovasini optimallashtirilgan holatga keltiramiz:

```bash
npm run build
```

Muvaffaqiyatli tugasa, ekranda `✓ Compiled successfully` yozuvi paydo bo‘ladi.

---

## 8. 7-qadam: PM2 yordamida doimiy ishga tushirish

Terminalni yopsangiz ham dastur to‘xtab qolmasligi va server qayta yoqilganda (reboot) avtomatik o‘zi ishga tushishi uchun **PM2** jarayon menejeridan foydalanamiz:

```bash
# PM2 ni global o‘rnatish
sudo npm install -g pm2

# Dasturni PM2 orqali ishga tushirish
pm2 start npm --name "labcontrol" -- run start

# Server qayta yonganda avtomatik ishga tushirishini ta'minlash
pm2 startup
# (Terminalda ko‘rsatilgan 'sudo env PATH=...' buyrug‘ini ko‘chirib ishga tushiring)

# Hozirgi holatni saqlash
pm2 save
```

Foydali PM2 buyruqlari:
```bash
pm2 status           # Dastur ishlayotganini ko‘rish
pm2 logs labcontrol  # Xatoliklar yoki loglarni jonli ko‘rish
pm2 restart labcontrol # Dasturni qayta ishga tushirish
pm2 stop labcontrol    # Dasturni to‘xtatish
```

---

## 9. 8-qadam: Miyya.uz domeniga ulash

Dastur hozir serverning `http://localhost:3000` portida ishlayapti. Uni tashqi olamga — **miyya.uz** ga yo‘naltirishning 2 ta qulay usuli bor:

### Variant A: Cloudflare Tunnel orqali (Tavsiya etiladi — port ochish va SSL sertifikat shart emas!)

1. Serverga `cloudflared` ni o‘rnating:
   ```bash
   curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
   sudo dpkg -i cloudflared.deb
   ```

2. Cloudflare hisobingizga kiring:
   ```bash
   cloudflared tunnel login
   ```
   *(Terminal bergan havolani brauzerda ochib, miyya.uz domenini tanlang)*

3. Loyihada tayyor `cloudflared-config.yml` bor. Tunnelni ishga tushiring:
   ```bash
   cloudflared tunnel run
   ```

   *(Tunnelni doimiy xizmat sifatida o‘rnatish uchun: `sudo cloudflared service install`)*

---

### Variant B: Nginx + Certbot (Standart VPS usuli)

1. Nginx o‘rnating:
   ```bash
   sudo apt install -y nginx
   ```

2. Yangi konfiguratsiya faylini oching:
   ```bash
   sudo nano /etc/nginx/sites-available/labcontrol
   ```

   Ichiga quyidagilarni yozing:
   ```nginx
   server {
       server_name miyya.uz www.miyya.uz;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

3. Konfiguratsiyani yoqing va Nginx ni qayta yuklang:
   ```bash
   sudo ln -s /etc/nginx/sites-available/labcontrol /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. Bepul SSL (HTTPS) sertifikatini o‘rnating:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d miyya.uz -d www.miyya.uz
   ```

---

## 10. Muammolar va ularning yechimlari

### 1. `npm install` da Argon2 xatolik bersa:
* **Sabab:** C++ kompilyatori yetishmayapti.
* **Yechim:** `sudo apt install -y build-essential python3` buyrug‘ini bering va qayta `npm install` qiling.

### 2. Dastur kutilmaganda to‘xtab qolsa:
* Loglarni ko‘ring:
  ```bash
  pm2 logs labcontrol --lines 50
  ```

### 3. Ma'lumotlar papkasiga ruxsat yetishmasa:
* Papkaga ruxsat bering:
  ```bash
  mkdir -p data/uploads
  chmod -R 755 data
  ```

---

Tabriklaymiz! Endi **https://miyya.uz** manziliga kirib, LabControl tizimidan to‘liq foydalanishingiz mumkin! 🎉
