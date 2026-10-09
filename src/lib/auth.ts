import 'server-only';

import argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { Permission, User } from '@/types';
import { db } from '@/lib/db';
import { hasPermission, userWithPolicy } from '@/lib/policy';

const SESSION_COOKIE = 'labcontrol_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const SESSION_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.LABCONTROL_SESSION_FILE || path.join(process.cwd(), 'data', 'sessions.json'));
const databaseFile = process.env.LABCONTROL_DATABASE_FILE || path.join(process.cwd(), 'data', process.env.LABCONTROL_DEMO_MODE === 'true' ? 'database.json' : 'production.database.json');
const defaultCredentialsFile = process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || os.homedir(), 'LabControl', 'credentials.json')
  : path.join(path.dirname(path.resolve(databaseFile)), 'credentials.json');
const CREDENTIALS_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.LABCONTROL_CREDENTIALS_FILE || defaultCredentialsFile);
const failedLogins = new Map<string, { count: number; firstAt: number; lockedUntil: number }>();

interface SessionRecord {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: number;
  revokedAt?: string;
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function parseCookies(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of (header || '').split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    const name = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (name) {
      try { cookies.set(name, decodeURIComponent(value)); } catch { /* Ignore malformed cookie values. */ }
    }
  }
  return cookies;
}

async function readSessions(): Promise<SessionRecord[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ SESSION_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (error: any) {
    if (error?.code === 'ENOENT') return [];
    throw new Error('Sessiya omborini o‘qib bo‘lmadi');
  }
}

let writeQueue: Promise<void> = Promise.resolve();
let sessionMutationQueue: Promise<void> = Promise.resolve();
async function writeSessions(records: SessionRecord[]): Promise<void> {
  const nextWrite = writeQueue.then(async () => {
    await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(SESSION_FILE), { recursive: true });
    const temporaryPath = `${SESSION_FILE}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
    await fs.writeFile(/*turbopackIgnore: true*/ temporaryPath, JSON.stringify(records), { encoding: 'utf8', mode: 0o600 });
    await fs.rename(/*turbopackIgnore: true*/ temporaryPath, SESSION_FILE);
  });
  writeQueue = nextWrite.catch(() => undefined);
  await nextWrite;
}

async function mutateSessions(mutation: (records: SessionRecord[]) => SessionRecord[]): Promise<void> {
  const nextMutation = sessionMutationQueue.then(async () => {
    const records = await readSessions();
    await writeSessions(mutation(records));
  });
  sessionMutationQueue = nextMutation.catch(() => undefined);
  await nextMutation;
}

function recordFailedLogin(key: string, now: number): void {
  if (failedLogins.size >= 10_000) {
    for (const [entryKey, value] of failedLogins) {
      if (now - value.firstAt > 15 * 60 * 1000) failedLogins.delete(entryKey);
      if (failedLogins.size < 9_000) break;
    }
  }
  const attempt = failedLogins.get(key);
  const count = attempt && now - attempt.firstAt < 15 * 60 * 1000 ? attempt.count + 1 : 1;
  if (failedLogins.size >= 10_000 && !failedLogins.has(key)) failedLogins.delete(failedLogins.keys().next().value!);
  failedLogins.set(key, { count, firstAt: attempt?.firstAt || now, lockedUntil: count >= 5 ? now + 15 * 60 * 1000 : 0 });
}

function parseCredentialHashes(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([identifier, hash]) => {
      const key = identifier.trim().toLowerCase();
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key);
      const validLoginId = /^[a-z0-9][a-z0-9._-]{1,79}$/.test(key);
      return (validEmail || validLoginId) && typeof hash === 'string' && hash.length <= 512 && hash.startsWith('$argon2id$');
    }).map(([identifier, hash]) => [identifier.trim().toLowerCase(), hash as string]));
  } catch {
    return {};
  }
}

interface StoredCredentialData {
  passwordHashes: Record<string, string>;
}

async function readStoredCredentialData(): Promise<StoredCredentialData> {
  try {
    const parsed = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ CREDENTIALS_FILE, 'utf8'));
    return {
      passwordHashes: parseCredentialHashes(JSON.stringify(parsed?.passwordHashes || {}))
    };
  } catch (error: any) {
    if (error?.code === 'ENOENT') return { passwordHashes: {} };
    throw new Error('Hisob credential omborini o‘qib bo‘lmadi');
  }
}

async function writeStoredCredentialData(data: StoredCredentialData): Promise<void> {
  await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(CREDENTIALS_FILE), { recursive: true });
  const temporaryPath = `${CREDENTIALS_FILE}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
  await fs.writeFile(/*turbopackIgnore: true*/ temporaryPath, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  await fs.rename(/*turbopackIgnore: true*/ temporaryPath, CREDENTIALS_FILE);
}

let credentialMutationQueue: Promise<void> = Promise.resolve();
async function mutateStoredCredentials(mutation: (data: StoredCredentialData) => boolean): Promise<boolean> {
  let changed = false;
  const nextMutation = credentialMutationQueue.then(async () => {
    const data = await readStoredCredentialData();
    changed = mutation(data);
    if (changed) await writeStoredCredentialData(data);
  });
  credentialMutationQueue = nextMutation.catch(() => undefined);
  await nextMutation;
  return changed;
}

export async function storePasswordCredential(identifier: string, encodedHash: string): Promise<boolean> {
  const key = identifier.trim().toLowerCase();
  if (!key || !encodedHash.startsWith('$argon2id$')) return false;
  if (parseCredentialHashes(process.env.LABCONTROL_PASSWORD_HASHES_JSON)[key]) return false;
  return mutateStoredCredentials(data => {
    if (data.passwordHashes[key]) return false;
    data.passwordHashes[key] = encodedHash;
    return true;
  });
}

export async function removePasswordCredential(identifier: string, encodedHash: string): Promise<void> {
  const key = identifier.trim().toLowerCase();
  await mutateStoredCredentials(data => {
    if (data.passwordHashes[key] !== encodedHash) return false;
    delete data.passwordHashes[key];
    return true;
  });
}

async function replacePasswordCredential(identifier: string, expectedHash: string, encodedHash: string): Promise<boolean> {
  const key = identifier.trim().toLowerCase();
  if (!key || !encodedHash.startsWith('$argon2id$')) return false;
  if (parseCredentialHashes(process.env.LABCONTROL_PASSWORD_HASHES_JSON)[key]) return false;
  return mutateStoredCredentials(data => {
    if (data.passwordHashes[key] !== expectedHash) return false;
    data.passwordHashes[key] = encodedHash;
    return true;
  });
}

async function getCredentialHashes(): Promise<Record<string, string>> {
  return {
    ...(await readStoredCredentialData()).passwordHashes,
    ...parseCredentialHashes(process.env.LABCONTROL_PASSWORD_HASHES_JSON)
  };
}

function sameOrigin(request: Request): boolean {
  if (process.env.NODE_ENV === 'production' && !process.env.LABCONTROL_PUBLIC_ORIGIN) return false;
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.LABCONTROL_PUBLIC_ORIGIN,
    ...(process.env.LABCONTROL_ALLOWED_ORIGINS || '').split(',')
  ].map(value => value?.trim()).filter((value): value is string => Boolean(value));
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'http';
  const hostOrigin = host ? `${proto}://${host}` : undefined;
  let urlOrigin: string | undefined;
  try {
    urlOrigin = new URL(request.url).origin;
  } catch {
    urlOrigin = undefined;
  }

  const originAllowed = allowedOrigins.length > 0
    ? (allowedOrigins.includes(origin || '') || origin === hostOrigin || origin === urlOrigin)
    : (origin === urlOrigin || origin === hostOrigin);
  const fetchSite = request.headers.get('sec-fetch-site');
  return Boolean(originAllowed && (!fetchSite || fetchSite === 'same-origin'));
}

function cookieOptions(maxAge: number, request: Request) {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  const isHttps = forwardedProto
    ? forwardedProto === 'https'
    : new URL(request.url).protocol === 'https:';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'strict' as const,
    path: '/',
    maxAge
  };
}

export async function authenticatedUser(request: Request): Promise<User | null> {
  const token = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE);
  if (!token || token.length > 200) return null;
  const tokenHash = digest(token);
  const session = (await readSessions()).find(record =>
    record.tokenHash === tokenHash && !record.revokedAt && record.expiresAt > Date.now()
  );
  if (!session) return null;
  const user = db.getUser(session.userId);
  return user ? userWithPolicy(user) : null;
}

export async function requireUser(request: Request): Promise<User | NextResponse> {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase()) && !sameOrigin(request)) {
    return NextResponse.json({ error: 'So‘rov manbasi tasdiqlanmadi' }, { status: 403 });
  }
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Avtorizatsiya talab qilinadi' }, { status: 401 });
  return user;
}

export async function requirePermission(request: Request, permission: Permission): Promise<User | NextResponse> {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;
  if (!hasPermission(user, permission)) {
    return NextResponse.json({ error: 'Bu amal uchun ruxsat yo‘q' }, { status: 403 });
  }
  return user;
}

export async function changeOwnPassword(
  request: Request,
  currentPassword: string,
  nextPassword: string
): Promise<NextResponse> {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;
  if (currentPassword.length === 0 || currentPassword.length > 1024) {
    return NextResponse.json({ error: 'Amaldagi parol noto‘g‘ri' }, { status: 401 });
  }
  if (nextPassword.length < 12 || nextPassword.length > 1024) {
    return NextResponse.json({ error: 'Yangi parol 12–1024 belgi bo‘lishi kerak' }, { status: 400 });
  }

  const stored = await readStoredCredentialData();
  const environmentHashes = parseCredentialHashes(process.env.LABCONTROL_PASSWORD_HASHES_JSON);
  const identifiers = [user.email, user.loginId, user.id]
    .filter((value): value is string => Boolean(value))
    .map(value => value.trim().toLowerCase());
  const effectiveHashes = { ...stored.passwordHashes, ...environmentHashes };
  const credentialKey = identifiers.find(key => Boolean(effectiveHashes[key]));
  const currentHash = credentialKey ? effectiveHashes[credentialKey] : undefined;
  if (!currentHash || !await argon2.verify(currentHash, currentPassword)) {
    return NextResponse.json({ error: 'Amaldagi parol noto‘g‘ri' }, { status: 401 });
  }
  if (nextPassword === currentPassword) {
    return NextResponse.json({ error: 'Yangi parol amaldagi paroldan farq qilishi kerak' }, { status: 400 });
  }

  const managedKey = identifiers.find(key => stored.passwordHashes[key] === currentHash && !environmentHashes[key]);
  if (!managedKey) {
    return NextResponse.json({ error: 'Bu hisob paroli server konfiguratsiyasida boshqariladi' }, { status: 409 });
  }

  let nextHash: string;
  try { nextHash = await argon2.hash(nextPassword, { type: argon2.argon2id }); }
  catch { return NextResponse.json({ error: 'Yangi parolni xavfsiz saqlab bo‘lmadi' }, { status: 503 }); }
  try {
    const replaced = await replacePasswordCredential(managedKey, currentHash, nextHash);
    if (!replaced) return NextResponse.json({ error: 'Parol yaqinda o‘zgargan. Sahifani yangilang va qayta urinib ko‘ring.' }, { status: 409 });
  } catch {
    return NextResponse.json({ error: 'Credential omboriga xavfsiz yozib bo‘lmadi' }, { status: 503 });
  }

  const newToken = randomBytes(32).toString('base64url');
  const now = Date.now();
  await mutateSessions(records => [
    ...records.filter(record => record.userId !== user.id && record.expiresAt > now && !record.revokedAt),
    { tokenHash: digest(newToken), userId: user.id, createdAt: new Date(now).toISOString(), expiresAt: now + SESSION_TTL_MS }
  ]);
  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'ACCOUNT PASSWORD UPDATED',
    object: user.id,
    details: 'Foydalanuvchi o‘z parolini almashtirdi',
    ip: 'unknown',
    status: 'SUCCESS'
  });

  const response = NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(SESSION_COOKIE, newToken, cookieOptions(SESSION_TTL_MS / 1000, request));
  return response;
}

export function isAuthResponse(value: User | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

function clientKey(request: Request, identifier: string): string {
  const ip = request.headers.get('x-real-ip') || 'unknown-client';
  return `${ip}|${identifier.toLowerCase()}`;
}

export async function loginWithPassword(request: Request, identifierValue: unknown, passwordValue: unknown) {
  const headersOk = sameOrigin(request);
  if (!headersOk) return NextResponse.json({ error: 'So‘rov manbasi tasdiqlanmadi' }, { status: 403 });

  const identifier = typeof identifierValue === 'string' ? identifierValue.trim().toLowerCase() : '';
  const password = typeof passwordValue === 'string' ? passwordValue : '';
  const key = clientKey(request, identifier);
  const now = Date.now();
  const attempt = failedLogins.get(key);
  if (attempt && attempt.lockedUntil > now) {
    return NextResponse.json({ error: 'Kirish vaqtincha bloklandi. Keyinroq qayta urinib ko‘ring.' }, { status: 429 });
  }

  const hashes = await getCredentialHashes();
  if (Object.keys(hashes).length === 0 || db.getUsers().length === 0) {
    return NextResponse.json({ error: 'Kirish sozlanmagan. Tizim administratori hisoblar va Argon2id hashlarini serverda sozlashi kerak.' }, { status: 503 });
  }
  const userRecord = db.getUserByLoginIdentifier(identifier);
  const credentialKeys = [identifier, userRecord?.loginId?.toLowerCase(), userRecord?.email?.toLowerCase()].filter((value): value is string => Boolean(value));
  const encodedHash = credentialKeys.map(credentialKey => hashes[credentialKey]).find(Boolean);
  let passwordOk = false;
  if (encodedHash && userRecord && password.length <= 1024) {
    try { passwordOk = await argon2.verify(encodedHash, password); } catch { passwordOk = false; }
  }
  if (!passwordOk || !userRecord) {
    recordFailedLogin(key, now);
    return NextResponse.json({ error: 'Login identifikatori yoki parol noto‘g‘ri' }, { status: 401 });
  }

  failedLogins.delete(key);
  const token = randomBytes(32).toString('base64url');
  const existingToken = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE);
  await mutateSessions(records => {
    const sessions = records.filter(record => record.expiresAt > now && !record.revokedAt && record.tokenHash !== (existingToken ? digest(existingToken) : ''));
    sessions.push({ tokenHash: digest(token), userId: userRecord.id, createdAt: new Date(now).toISOString(), expiresAt: now + SESSION_TTL_MS });
    return sessions;
  });

  const response = NextResponse.json({ user: userWithPolicy(userRecord) });
  response.cookies.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_MS / 1000, request));
  return response;
}

export async function revokeSession(request: Request): Promise<NextResponse> {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'So‘rov manbasi tasdiqlanmadi' }, { status: 403 });
  const token = parseCookies(request.headers.get('cookie')).get(SESSION_COOKIE);
  if (token) {
    await mutateSessions(records => {
      const record = records.find(item => item.tokenHash === digest(token) && !item.revokedAt);
      if (record) record.revokedAt = new Date().toISOString();
      return records;
    });
  }
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', cookieOptions(0, request));
  return response;
}

export function publicUserList(includeContacts = false): User[] {
  return db.getUsers().map(user => ({
    id: user.id,
    loginId: user.loginId,
    staffRosterId: user.staffRosterId,
    name: user.name,
    email: includeContacts ? user.email : '',
    phone: includeContacts ? user.phone : undefined,
    role: user.role,
    position: user.position,
    permissions: [],
    avatar: user.avatar
  }));
}
