import argon2 from 'argon2';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const defaultPassword = process.argv[2] || 'LabControl2026!';

const targetUsers = [
  { loginId: 'umar_boliyev', email: '' },
  { loginId: 'asadbek_abdumannopov', email: 'asadbeiavazbekovich@gmail.com' },
  { loginId: 'farangiz_ismoilova', email: '' },
  { loginId: 'ildar_yusupov', email: '' },
  { loginId: 'qurvonali_saydahmedov', email: '' },
  { loginId: 'muhammadali_turdiyev', email: '' },
  { loginId: 'shaxlo_abdullayeva', email: '' }
];

async function main() {
  console.log(`Barcha hisoblar uchun parol o‘rnatilmoqda: ${defaultPassword}`);
  const hash = await argon2.hash(defaultPassword, { type: argon2.argon2id });

  const passwordHashes = {};
  for (const user of targetUsers) {
    if (user.loginId) passwordHashes[user.loginId.toLowerCase()] = hash;
    if (user.email) passwordHashes[user.email.toLowerCase()] = hash;
  }

  const credentialData = { passwordHashes };
  const targetPaths = [
    path.join(process.env.LOCALAPPDATA || 'C:\\Users\\user\\AppData\\Local', 'LabControl', 'credentials.json'),
    path.join(process.cwd(), 'data', 'credentials.json')
  ];

  for (const targetPath of targetPaths) {
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, JSON.stringify(credentialData, null, 2), { encoding: 'utf8', mode: 0o600 });
    console.log(`Saqlandi: ${targetPath}`);
  }

  console.log('Argon2id hisoblari muvaffaqiyatli sozlandi!');
}

main().catch(err => {
  console.error('Xatolik:', err);
  process.exit(1);
});
