import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildMigrationPlan } from '../scripts/migration-plan.mjs';
import { parseStaffRoster } from '../src/lib/data/staff-roster.mjs';

const root = process.cwd();
const fixturePath = path.join(root, 'tests', 'fixtures', 'migration-source.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const plan = buildMigrationPlan(fixture);
let passed = 0;

function check(condition, label) {
  assert.ok(condition, label);
  passed += 1;
  console.log(`[PASS] ${label}`);
}

check(fixture.users.length === 7, 'Deterministik fixture yetti sintetik hisobni o‘z ichiga oladi');
check(plan.counts.users.accepted === 7, 'Barcha sintetik foydalanuvchilar importga yaroqli');
check(plan.counts.projects.accepted === 2, 'Fixture loyihalarining manager/member foreign keylari mavjud');
check(plan.counts.tasks.accepted === 1 && plan.counts.tasks.rejected === 1, 'Orphan vazifa rad etiladi va boshqa loyihaga avtomatik ko‘chirilmaydi');
check(plan.totals.orphanRows === 1, 'Dry-run orphan sonini alohida ko‘rsatadi');
check(plan.rows.documents.every(document => document.source === 'synthetic fixture' && document.verified), 'Hujjat fixture manbasi va tasdiq izi tekshiriladi');
check(plan.unknownFields.length === 0 && plan.totals.piiMismatchCount === 0, 'Fixture’da noma’lum maydon yoki shaxs nomi nomuvofiqligi yo‘q');

const rosterText = fs.readFileSync(path.join(root, 'data', 'xodim.txt'), 'utf8');
const roster = parseStaffRoster(rosterText);
check(roster.length === 7 && roster.map(user => user.loginId).join(',') === 'umar_boliyev,asadbek_abdumannopov,farangiz_ismoilova,ildar_yusupov,qurvonali_saydahmedov,muhammadali_turdiyev,shaxlo_abdullayeva', 'Roster’dagi yetti xodimga ism_familiya login ID beriladi');
check(roster[0].role === 'ADMIN' && roster[1].role === 'SUPER_ADMIN' && roster.slice(2).every(user => user.role === 'USER'), 'Roster rollari boshliq, texnik administrator va besh xodimga to‘g‘ri moslangan');
check(roster.every(user => user.email === '' && !user.phone && user.identitySource === 'data/xodim.txt'), 'Roster provisioning email yoki telefon uydirmaydi va manbasini belgilaydi');
const rosterPlan = buildMigrationPlan({ users: roster });
check(rosterPlan.counts.users.accepted === 7 && rosterPlan.counts.users.rejected === 0, 'Login ID bilan email manzilisiz roster yozuvlari migratsiya dry-run’dan o‘tadi');

const duplicate = structuredClone(fixture);
duplicate.users.push({ ...duplicate.users[0], id: 'fixture-user-copy' });
const duplicatePlan = buildMigrationPlan(duplicate);
check(duplicatePlan.errors.some(item => item.reason === 'duplicate_email'), 'Takrorlangan email importda aniqlanadi');

const unknown = structuredClone(fixture);
unknown.tasks[0].unreviewedValue = 'sensitive sample';
const unknownPlan = buildMigrationPlan(unknown);
check(unknownPlan.unknownFields.some(field => field.includes('tasks[0].unreviewedValue')), 'Noma’lum maydonlar qiymatini oshkor qilmasdan qayd etiladi');

const mismatch = structuredClone(fixture);
mismatch.tasks[0].assigneeName = 'Boshqa shaxs';
const mismatchPlan = buildMigrationPlan(mismatch);
check(mismatchPlan.totals.piiMismatchCount === 1 && mismatchPlan.piiMismatches[0].includes('assigneeName'), 'Denormalizatsiya qilingan ism nomuvofiqligi importdan oldin topiladi');

const databaseCode = fs.readFileSync(path.join(root, 'src', 'lib', 'db.ts'), 'utf8');
check(databaseCode.includes('production.database.json') && databaseCode.includes('LABCONTROL_DEMO_MODE'), 'Standart ombor demo bazadan ajratilgan va demo flag bilan cheklangan');
check(databaseCode.includes('users: Array.isArray(parsed.users)') && databaseCode.includes('delete snapshot.currentUserId'), 'JSON omboridan faqat tasdiqlangan maydonlar olinadi; global identity memory’ga o‘tmaydi');
const seedData = fs.readFileSync(path.join(root, 'src', 'lib', 'data', 'seed-data.ts'), 'utf8').split('export const SEED_PROJECTS')[0];
check(!seedData.includes('@lab.gov.uz') && !seedData.includes('+998'), 'Demo user seed’ida uydirma xodim email yoki telefonlari yo‘q');

const auth = fs.readFileSync(path.join(root, 'src', 'lib', 'auth.ts'), 'utf8');
check(auth.includes('argon2id') && auth.includes('httpOnly: true') && auth.includes('sameSite: \'strict\''), 'Argon2id tekshiruvi va himoyalangan sessiya cookie mavjud');
check(!auth.includes('verifyTotp') && auth.includes('lockedUntil'), 'Kirish Argon2id paroli bilan himoyalangan va muvaffaqiyatsiz urinishlar bloklanadi');

const rag = fs.readFileSync(path.join(root, 'src', 'lib', 'ai', 'rag.ts'), 'utf8');
const provider = fs.readFileSync(path.join(root, 'src', 'lib', 'ai', 'provider.ts'), 'utf8');
check(rag.includes('document.isDemo !== true') && rag.includes('searchKnowledgeItems') && rag.includes('allowedKnowledgeIds'), 'RAG demo bo‘lmagan hujjat va ruxsatli bilim yozuvlarini qidiradi');
check(provider.includes('Ichki hujjatlar va bilimlar bazasida') && provider.includes('chunkId'), 'Ichki manba bo‘lmasa tashqi AI so‘rash imkonini ko‘rsatuvchi javob va manba ID qaytadi');

const settings = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check(Boolean(settings.scripts['test:api'] && settings.scripts['test:migration']), 'Izolyatsiyalangan API va migratsiya tekshiruv buyruqlari mavjud');

console.log(`\nNatija: ${passed}/${passed} tekshiruv o‘tdi.`);
