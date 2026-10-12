import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import argon2 from 'argon2';

const root = process.cwd();
const fixturePath = path.join(root, 'tests', 'fixtures', 'migration-source.json');
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
fixture.tasks = fixture.tasks.filter(task => task.projectId !== 'missing-project');
fixture.tasks.push({
  ...fixture.tasks[0], id: 'fixture-task-4', title: 'Ikkinchi sintetik vazifa', projectId: 'fixture-project-4', projectName: 'Sinov loyiha B',
  assigneeId: 'fixture-user-4', assigneeName: 'Sinov foydalanuvchi 4', creatorId: 'fixture-user-4', creatorName: 'Sinov foydalanuvchi 4'
});
fixture.projects.push({
  id: 'fixture-project-empty', name: 'Bo‘sh sintetik loyiha', code: 'FX-EMPTY', description: 'API test only', status: 'Planning', priority: 'Low',
  managerId: 'fixture-user-1', teamIds: ['fixture-user-1'], documentsCount: 0, tasksCount: 0, progressPercent: 0,
  technicalParameters: [], overview: '', decisions: [], tags: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
});
fixture.documents.forEach(document => { document.isDemo = false; });
fixture.documents[0].storagePath = 'fixture-3.txt';
fixture.documents[1].storagePath = 'fixture-4.txt';
fixture.documents.push({
  ...fixture.documents[0], id: 'fixture-doc-5', title: 'Unattached synthetic source', originalName: 'fixture-5.txt',
  storagePath: 'fixture-5.txt', projectId: undefined, projectName: undefined,
  uploadedById: 'fixture-user-5', uploadedByName: 'Sinov foydalanuvchi 5', verified: false,
  verifiedById: undefined, verifiedByName: undefined, verifiedAt: undefined
});
fixture.knowledge = [{
  id: 'fixture-knowledge-3', title: 'Alfa calibration reference', category: 'Hardware',
  content: 'alfa calibration uchun xavfsiz bosim oralig‘i va kalibrlash bosqichlari.',
  projectId: 'fixture-project-3', projectName: 'Sintetik loyiha 3', technicalParams: [], tags: ['alfa', 'calibration'],
  updatedAt: '2026-01-01T00:00:00.000Z', ownerId: 'fixture-user-3', isDemo: false
}, {
  id: 'fixture-knowledge-4', title: 'Bravo synthetic reference', category: 'Hardware',
  content: 'Bravo loyihasi uchun sintetik bilim yozuvi.',
  projectId: 'fixture-project-4', projectName: 'Sintetik loyiha 4', technicalParams: [], tags: ['bravo'],
  updatedAt: '2026-01-01T00:00:00.000Z', ownerId: 'fixture-user-4', isDemo: false
}];

const testDir = await fs.mkdtemp(path.join(os.tmpdir(), `labcontrol-api-${process.pid}-`));
const databasePath = path.join(testDir, 'api-test-database.json');
const sessionPath = path.join(testDir, 'api-test-sessions.json');
const uploadsPath = path.join(testDir, 'uploads');
await fs.writeFile(databasePath, JSON.stringify(fixture, null, 2), { mode: 0o600 });
await fs.mkdir(uploadsPath, { recursive: true });
await fs.writeFile(path.join(uploadsPath, 'fixture-3.txt'), 'Synthetic download fixture.');
await fs.writeFile(path.join(uploadsPath, 'fixture-4.txt'), 'Bravo download fixture.');
await fs.writeFile(path.join(uploadsPath, 'fixture-5.txt'), 'Unattached synthetic fixture.');

const reservation = net.createServer();
reservation.listen(0, '127.0.0.1');
await once(reservation, 'listening');
const port = reservation.address().port;
await new Promise(resolve => reservation.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const ollamaRequests = [];
const ollamaMock = createServer(async (request, response) => {
  let rawBody = '';
  for await (const chunk of request) rawBody += chunk;
  if (request.url === '/api/tags') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ models: [{ name: 'fixture-model' }] }));
    return;
  }
  if (request.url !== '/api/chat') {
    response.writeHead(404).end();
    return;
  }
  const payload = JSON.parse(rawBody || '{}');
  ollamaRequests.push(payload);
  const userMessage = payload.messages?.filter(message => message.role === 'user').at(-1);
  const requestContext = JSON.parse(userMessage?.content || '{}');
  const question = typeof requestContext.question === 'string' ? requestContext.question : '';
  if (question.includes('fallback-case')) {
    response.writeHead(503).end();
    return;
  }
  if (question.includes('invalid-citation-case')) {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ message: { role: 'assistant', content: 'Xavfsiz bosim oralig‘i 42 bar [S99].' } }));
    return;
  }
  const content = question.includes('insufficient-case')
    ? '[[INSUFFICIENT_SOURCE]]'
    : 'Alfa kalibrlashda hujjatdagi tartib va bilim yozuvidagi xavfsiz bosim oralig‘iga amal qiling [S1] [S2].';
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ message: { role: 'assistant', content } }));
});
ollamaMock.listen(0, '127.0.0.1');
await once(ollamaMock, 'listening');
const ollamaPort = ollamaMock.address().port;
const password = `synthetic-${randomBytes(16).toString('hex')}`;
const emails = fixture.users.map(user => (user.email || '').toLowerCase());
const hash = await argon2.hash(password, { type: argon2.argon2id });
const passwordHashes = Object.fromEntries([
  ...emails.filter(Boolean).map(email => [email, hash]),
  ...fixture.users.map(user => [user.loginId, hash])
]);
await fs.writeFile(path.join(testDir, 'api-test-credentials.json'), JSON.stringify({ passwordHashes }, null, 2), { mode: 0o600 });
const nextCli = path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next');
const server = spawn(process.execPath, [nextCli, 'start', '-p', String(port)], {
  cwd: root,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(port),
    LABCONTROL_DATABASE_FILE: databasePath,
    LABCONTROL_SESSION_FILE: sessionPath,
    LABCONTROL_UPLOADS_DIR: uploadsPath,
    LABCONTROL_CREDENTIALS_FILE: path.join(testDir, 'api-test-credentials.json'),
    LABCONTROL_DEMO_MODE: 'false',
    LABCONTROL_PUBLIC_ORIGIN: origin,
    LABCONTROL_PASSWORD_HASHES_JSON: '{}',
    OLLAMA_URL: `http://127.0.0.1:${ollamaPort}`,
    OLLAMA_ALLOWED_HOSTS: '127.0.0.1',
    OPENROUTER_API_KEY: '',
    LABCONTROL_OPENROUTER_MODEL: 'openrouter/free',
    NEXT_TELEMETRY_DISABLED: '1'
  },
  stdio: 'ignore',
  windowsHide: true
});

let passed = 0;
function check(value, label) { assert.ok(value, label); passed += 1; console.log(`[PASS] ${label}`); }
async function request(method, route, cookie, body) {
  const headers = { origin, 'sec-fetch-site': 'same-origin' };
  if (cookie) headers.cookie = cookie;
  if (body !== undefined && !(body instanceof FormData)) headers['content-type'] = 'application/json';
  const response = await fetch(`${origin}${route}`, {
    method, headers, body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
    cache: 'no-store', redirect: 'manual'
  });
  return response;
}
async function waitForServer() {
  const until = Date.now() + 90_000;
  while (Date.now() < until) {
    if (server.exitCode !== null) throw new Error(`Next server exited with ${server.exitCode}`);
    try { const response = await fetch(origin, { signal: AbortSignal.timeout(1000) }); if (response.status < 500) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Isolated API test server did not become ready');
}
async function waitForServerAt(processHandle, serverOrigin) {
  const until = Date.now() + 90_000;
  while (Date.now() < until) {
    if (processHandle.exitCode !== null) throw new Error(`Isolated Next server exited with ${processHandle.exitCode}`);
    try { const response = await fetch(serverOrigin, { signal: AbortSignal.timeout(1000) }); if (response.status < 500) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('Isolated roster-provisioning server did not become ready');
}
function cookieFrom(response) {
  const value = response.headers.get('set-cookie') || '';
  const match = value.match(/labcontrol_session=([^;]+)/);
  if (!match) throw new Error('Login did not return the session cookie');
  return `labcontrol_session=${match[1]}`;
}
async function login(index) {
  const response = await request('POST', '/api/auth/login', undefined, {
    identifier: emails[index] || fixture.users[index].loginId, password
  });
  assert.equal(response.status, 200, `Synthetic account ${index + 1} login`);
  return { cookie: cookieFrom(response), user: (await response.json()).user };
}

try {
  await waitForServer();

  const anonymousCases = [
    ['GET','/api/auth/login'], ['GET','/api/auth/session'], ['POST','/api/auth/session',{ userId:'fixture-user-1' }], ['GET','/api/auth/profile'], ['PUT','/api/auth/profile',{ role:'SUPER_ADMIN' }], ['POST','/api/auth/profile',{}], ['PUT','/api/auth/password',{ currentPassword:'x',newPassword:'x' }],
    ['GET','/api/dashboard/stats'], ['GET','/api/search?q=alfa'], ['GET','/api/projects'], ['POST','/api/projects',{ name:'x',code:'FX-X' }], ['PUT','/api/projects',{ id:'x' }], ['DELETE','/api/projects?id=x'],
    ['GET','/api/tasks'], ['POST','/api/tasks',{ title:'x' }], ['PUT','/api/tasks',{ id:'x' }], ['DELETE','/api/tasks?id=x'], ['GET','/api/documents'], ['POST','/api/documents'],
    ['GET','/api/documents/fixture-doc-3'], ['PUT','/api/documents/fixture-doc-3',{ verified:true,provenance:'test source' }], ['DELETE','/api/documents/fixture-doc-3'], ['GET','/api/documents/fixture-doc-3/download'],
    ['GET','/api/knowledge'], ['POST','/api/knowledge',{ title:'x' }], ['PUT','/api/knowledge',{ id:'x' }], ['DELETE','/api/knowledge?id=x'], ['GET','/api/team/chat'], ['POST','/api/team/chat',{ content:'x' }],
    ['POST','/api/team/users',{ name:'Synthetic employee',email:'new@example.test',position:'Umumiy dasturchi',password:'synthetic-employee-password' }],
    ['GET','/api/ai/chat'], ['POST','/api/ai/chat',{ prompt:'x' }], ['DELETE','/api/ai/chat'], ['GET','/api/settings'], ['POST','/api/settings',{}], ['GET','/api/audit'],
    ['GET','/api/backup'], ['POST','/api/backup'], ['GET','/api/ai/tts'], ['POST','/api/ai/tts',{ text:'synthetic',externalConsent:false }], ['POST','/api/ai/external',{ prompt:'synthetic' }],
    ['GET','/api/ai/action'], ['POST','/api/ai/action',{ confirmed:true }], ['POST','/api/auth/logout']
  ];
  for (const [method, route, body] of anonymousCases) {
    const response = await request(method, route, undefined, body);
    assert.equal(response.status, 401, `Anonymous ${method} ${route} must be 401`);
  }
  check(true, `Anonymous API matrix: ${anonymousCases.length} route/verb combinations return 401`);

  const invalidLogin = await request('POST', '/api/auth/login', undefined, { email: emails[2], password: 'wrong' });
  check(invalidLogin.status === 401, 'Wrong password is rejected');

  const users = [];
  for (let index = 0; index < fixture.users.length; index++) {
    const account = await login(index);
    check(account.user.id === fixture.users[index].id, `Synthetic profile ${index + 1} has an independent authenticated session`);
    users.push(account);
  }
  check(users[0].user.role === 'ADMIN' && users[1].user.role === 'SUPER_ADMIN', 'Head and technical administrator receive distinct source-aligned roles');
  check(users[0].user.permissions.includes('reports.view') && !users[0].user.permissions.includes('system.settings') && users[0].user.permissions.includes('team.contact.view'), 'Head gets management reporting and staff contacts without technical settings');
  check(users[1].user.permissions.includes('system.settings') && !users[1].user.permissions.includes('reports.view') && !users[1].user.permissions.includes('team.contact.view'), 'Technical administrator gets system controls without management or contact access');
  check(users[0].user.role === 'ADMIN' && users[1].user.role === 'SUPER_ADMIN', 'Both privileged roles sign in with only their identifier and password');
  check(users[1].user.permissions.includes('users.create') && !users[0].user.permissions.includes('users.create'), 'Only the technical administrator can create employee accounts');
  check(!users[2].user.permissions.includes('team.view') && !users[2].user.permissions.includes('reports.view'), 'Regular employees do not receive team directory or management report access');

  const newEmployee = {
    name: 'Synthetic employee', email: 'new-employee@example.test', position: 'Umumiy dasturchi',
    password: 'synthetic-employee-password-2026', role: 'SUPER_ADMIN'
  };
  const headCreate = await request('POST', '/api/team/users', users[0].cookie, newEmployee);
  const shortPassword = await request('POST', '/api/team/users', users[1].cookie, { ...newEmployee, email: 'short-password@example.test', password: 'short' });
  const createdResponse = await request('POST', '/api/team/users', users[1].cookie, newEmployee);
  const createdPayload = await createdResponse.json();
  const duplicateResponse = await request('POST', '/api/team/users', users[1].cookie, newEmployee);
  const adminPasswordWithoutMfa = await request('PUT', '/api/auth/password', users[1].cookie, {
    currentPassword: password, newPassword: 'synthetic-admin-password-2026'
  });
  const credentialFile = JSON.parse(await fs.readFile(path.join(testDir, 'api-test-credentials.json'), 'utf8'));
  check(headCreate.status === 403 && shortPassword.status === 400, 'Employee creation denies the laboratory head and rejects weak initial passwords');
  check(createdResponse.status === 201 && createdPayload.user.role === 'USER' && createdPayload.user.email === newEmployee.email, 'Technical administrator can create an employee, and role escalation is ignored');
  check(duplicateResponse.status === 409 && credentialFile.passwordHashes[newEmployee.email].startsWith('$argon2id$') && !JSON.stringify(credentialFile).includes(newEmployee.password), 'Duplicate email is rejected and only an Argon2id hash is persisted');
  check(adminPasswordWithoutMfa.status === 200, 'Administrator can change the password without an MFA code');
  users[1].cookie = cookieFrom(adminPasswordWithoutMfa);
  const createdLogin = await request('POST', '/api/auth/login', undefined, { identifier: newEmployee.email, password: newEmployee.password });
  const createdLoginPayload = await createdLogin.json();
  const createdCookie = cookieFrom(createdLogin);
  const wrongCurrentPassword = await request('PUT', '/api/auth/password', createdCookie, {
    currentPassword: 'wrong-initial-password', newPassword: 'synthetic-employee-password-2027'
  });
  const shortReplacementPassword = await request('PUT', '/api/auth/password', createdCookie, {
    currentPassword: newEmployee.password, newPassword: 'short'
  });
  const changedPassword = await request('PUT', '/api/auth/password', createdCookie, {
    currentPassword: newEmployee.password, newPassword: 'synthetic-employee-password-2027'
  });
  const oldSessionAfterChange = await request('GET', '/api/auth/session', createdCookie);
  const oldPasswordLogin = await request('POST', '/api/auth/login', undefined, {
    identifier: newEmployee.email, password: newEmployee.password
  });
  const newPasswordLogin = await request('POST', '/api/auth/login', undefined, {
    identifier: newEmployee.email, password: 'synthetic-employee-password-2027'
  });
  const updatedCredentialFile = JSON.parse(await fs.readFile(path.join(testDir, 'api-test-credentials.json'), 'utf8'));
  const changedLogout = newPasswordLogin.status === 200 ? await request('POST', '/api/auth/logout', cookieFrom(newPasswordLogin)) : null;
  check(createdLogin.status === 200 && createdLoginPayload.user.role === 'USER', 'New employee can log in with the created email and initial password');
  check(wrongCurrentPassword.status === 401 && shortReplacementPassword.status === 400, 'Password change rejects a wrong current password and a weak replacement');
  check(changedPassword.status === 200 && oldSessionAfterChange.status === 401, 'Password change rotates the active session and revokes the previous session');
  check(oldPasswordLogin.status === 401 && newPasswordLogin.status === 200 && changedLogout?.status === 200, 'Changed password works for a new login and the old password no longer works');
  check(updatedCredentialFile.passwordHashes[newEmployee.email].startsWith('$argon2id$') && !JSON.stringify(updatedCredentialFile).includes('synthetic-employee-password-2027'), 'Changed password is stored only as an Argon2id hash');

  const loginById = await request('POST', '/api/auth/login', undefined, {
    identifier: fixture.users[2].loginId, password
  });
  const loginByIdPayload = await loginById.json();
  check(loginById.status === 200 && loginByIdPayload.user.id === fixture.users[2].id, 'Roster-style login identifier authenticates the mapped account');
  const loginByIdLogout = await request('POST', '/api/auth/logout', cookieFrom(loginById));
  check(loginByIdLogout.status === 200, 'Roster-style login session can be revoked');

  const adminSession = await request('GET', '/api/auth/session', users[1].cookie);
  const adminState = await adminSession.json();
  check(adminSession.status === 200 && adminState.user.id === 'fixture-user-2', 'Session endpoint returns only the authenticated identity');
  check(adminState.team.every(member => Array.isArray(member.permissions) && member.permissions.length === 0), 'Session team list never discloses other users’ permissions');
  check(adminState.team.every(member => member.email === '' && !member.phone), 'Technical administrator team directory redacts staff contact details');
  const switchAttempt = await request('POST', '/api/auth/session', users[1].cookie, { userId: 'fixture-user-1' });
  check(switchAttempt.status === 405, 'Client identity switching endpoint is disabled');
  const profile = await request('PUT', '/api/auth/profile', users[2].cookie, { role: 'SUPER_ADMIN', name: 'Synthetic takeover' });
  check(profile.status === 400, 'Profile mass assignment of role/name is rejected');

  const expectedProjectCounts = [3, 3, 1, 1, 0, 0, 0];
  for (let index = 0; index < users.length; index++) {
    const response = await request('GET', '/api/projects', users[index].cookie);
    const projects = await response.json();
    check(response.status === 200 && projects.length === expectedProjectCounts[index], `Profile ${index + 1} sees only projects within its role/scope`);
  }

  const outsiderProject = await request('GET', '/api/tasks?projectId=fixture-project-4', users[2].cookie);
  const outsiderDocument = await request('GET', '/api/documents/fixture-doc-4', users[2].cookie);
  const outsiderDocuments = await request('GET', '/api/documents?projectId=fixture-project-4', users[2].cookie);
  const outsiderAI = await request('POST', '/api/ai/chat', users[2].cookie, { prompt: 'alfa calibration', projectId: 'fixture-project-4' });
  check([outsiderProject.status, outsiderDocument.status, outsiderDocuments.status, outsiderAI.status].every(status => status === 403), 'Cross-project task/document/chat access is denied (IDOR checks)');

  const userCreateTask = await request('POST', '/api/tasks', users[2].cookie, { title: 'Denied', projectId: 'fixture-project-3', deadline: '2026-12-01' });
  const userCreateKnowledge = await request('POST', '/api/knowledge', users[2].cookie, { title: 'Denied', category: 'Hardware', content: 'Denied' });
  const userSettings = await request('GET', '/api/settings', users[2].cookie);
  const userAudit = await request('GET', '/api/audit', users[2].cookie);
  const userBackup = await request('POST', '/api/backup', users[2].cookie);
  check([userCreateTask.status,userCreateKnowledge.status,userSettings.status,userAudit.status,userBackup.status].every(status => status === 403), 'USER create/settings/audit/backup actions are denied');

  const chatWithoutConsent = await request('POST', '/api/ai/chat', users[2].cookie, { prompt: 'alfa calibration', consent: false });
  const chatWithoutKey = await request('POST', '/api/ai/chat', users[2].cookie, { prompt: 'alfa calibration', consent: true });
  check(chatWithoutConsent.status === 403 && chatWithoutKey.status === 503, 'OpenRouter chat requires consent and reports missing server configuration without sending the prompt');
  const noSource = await request('POST', '/api/ai/chat', users[3].cookie, { prompt: 'Mars quantum reactor', projectId: 'fixture-project-4' });
  const externalWithoutConsent = await request('POST', '/api/ai/external', users[3].cookie, { prompt: 'Mars quantum reactor', consent: false });
  const externalNotConfigured = await request('POST', '/api/ai/external', users[3].cookie, { prompt: 'Mars quantum reactor', consent: true });
  check(externalWithoutConsent.status === 403 && externalNotConfigured.status === 503, 'External AI requires explicit consent and reports missing server configuration without sending data');

  const user3History = await request('GET', '/api/ai/chat', users[2].cookie);
  const user4History = await request('GET', '/api/ai/chat', users[3].cookie);
  const h3 = await user3History.json();
  const h4 = await user4History.json();
  check(h3.length === 0 && h4.length === 0, 'Failed external requests are not persisted in either account chat history');
  const clearUser4 = await request('DELETE', '/api/ai/chat', users[3].cookie);
  const preservedUser3 = await request('GET', '/api/ai/chat', users[2].cookie);
  const emptyUser4 = await request('GET', '/api/ai/chat', users[3].cookie);
  check(clearUser4.status === 200 && (await preservedUser3.json()).length === 0 && (await emptyUser4.json()).length === 0, 'Chat deletion keeps both account histories isolated');


  const ttsDeclined = await request('POST', '/api/ai/tts', users[2].cookie, { text: 'synthetic fixture text', externalConsent: false });
  const externalAI = await request('POST', '/api/ai/external', users[2].cookie, { prompt: 'synthetic fixture text', consent: true });
  check(ttsDeclined.status === 403 && externalAI.status === 503, 'Declined TTS consent sends no text; opted-in external AI reports missing configuration without sending data');
  if (process.env.LABCONTROL_LIVE_TTS_TEST === 'true') {
    const ttsSmoke = await request('POST', '/api/ai/tts', users[2].cookie, { text: 'LabControl sintetik ovoz sinovi.', externalConsent: true });
    const audio = await ttsSmoke.arrayBuffer();
    check(ttsSmoke.status === 200 && ttsSmoke.headers.get('content-type')?.startsWith('audio/mpeg') && audio.byteLength > 100, 'Explicitly opted-in synthetic TTS smoke test returns MPEG audio');
  }

  const roleChecks = [
    { method: 'GET', route: '/api/auth/session', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'POST', route: '/api/auth/session', body: { userId: 'fixture-user-1' }, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 405 },
    { method: 'GET', route: '/api/auth/login', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 405 },
    { method: 'POST', route: '/api/auth/profile', body: {}, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 405 },
    { method: 'GET', route: '/api/dashboard/stats', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'GET', route: '/api/search?q=alfa', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'GET', route: '/api/auth/profile', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'PUT', route: '/api/auth/profile', body: { avatar: 'data:image/png;base64,YQ==' }, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'GET', route: '/api/tasks?projectId=fixture-project-3', body: undefined, allowed: new Set([0, 1, 2]) },
    { method: 'GET', route: '/api/tasks?projectId=fixture-project-4', body: undefined, allowed: new Set([0, 1, 3]) },
    { method: 'GET', route: '/api/documents?projectId=fixture-project-3', body: undefined, allowed: new Set([0, 1, 2]) },
    { method: 'GET', route: '/api/documents?projectId=fixture-project-4', body: undefined, allowed: new Set([0, 1, 3]) },
    { method: 'GET', route: '/api/documents/fixture-doc-3/download', body: undefined, allowed: new Set([0, 1, 2]) },
    { method: 'GET', route: '/api/documents/fixture-doc-4/download', body: undefined, allowed: new Set([0, 1, 3]) },
    { method: 'GET', route: '/api/ai/chat', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'POST', route: '/api/ai/chat', body: { prompt: 'Synthetic full role matrix lookup 2026-10' }, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 403 },
    { method: 'DELETE', route: '/api/ai/chat', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'POST', route: '/api/ai/external', body: { prompt: 'synthetic prompt must not be sent', consent: true }, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 503 },
    { method: 'POST', route: '/api/ai/tts', body: { text: 'synthetic text must not be sent', externalConsent: false }, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 403 },
    { method: 'GET', route: '/api/ai/tts', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 405 },
    { method: 'GET', route: '/api/ai/action', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 405 },
    { method: 'GET', route: '/api/backup', body: undefined, allowed: new Set([0, 1, 2, 3, 4, 5, 6]), allowedStatus: 405 },
    { method: 'GET', route: '/api/settings', body: undefined, allowed: new Set([1]) },
    { method: 'GET', route: '/api/audit', body: undefined, allowed: new Set([0, 1]) },
    { method: 'POST', route: '/api/backup', body: undefined, allowed: new Set([0, 1]), allowedStatus: 200 },
    { method: 'POST', route: '/api/settings', body: { laboratoryName: 'Synthetic Lab' }, allowed: new Set([1]), allowedStatus: 200 },
    { method: 'POST', route: '/api/ai/action', body: { actionType: 'create_task', confirmed: true, parameters: { title: 'Synthetic AI task', projectId: 'fixture-project-3', assigneeId: 'fixture-user-3', deadline: '2026-12-01' } }, allowed: new Set([0, 1]) },
    { method: 'POST', route: '/api/team/chat', body: { content: 'Synthetic RBAC chat', senderId: 'fixture-user-1', senderRole: 'SUPER_ADMIN' }, allowed: new Set([0, 1, 2, 3, 4, 5, 6]) },
    { method: 'POST', route: '/api/projects', body: { name: 'Sintetik RBAC loyihasi', code: 'FX-RBAC-1' }, allowed: new Set([0]) },
    { method: 'PUT', route: '/api/projects', body: { id: 'fixture-project-3', overview: 'RBAC fixture update' }, allowed: new Set([0]) },
    { method: 'POST', route: '/api/tasks', body: { title: 'Sintetik ruxsat vazifasi', projectId: 'fixture-project-3', assigneeId: 'fixture-user-3', deadline: '2026-12-01' }, allowed: new Set([0, 1]) },
    { method: 'PUT', route: '/api/tasks', body: { id: 'fixture-task-3', comment: 'RBAC fixture comment' }, allowed: new Set([0, 1, 2]) },
    { method: 'POST', route: '/api/knowledge', body: { title: 'Sintetik bilim', category: 'Hardware', content: 'Fixture-only.' }, allowed: new Set([0, 1]) },
    { method: 'PUT', route: '/api/knowledge', body: { id: 'fixture-knowledge-3', title: 'Updated synthetic knowledge' }, allowed: new Set([0, 1]) },
    { method: 'GET', route: '/api/knowledge?projectId=fixture-project-3', body: undefined, allowed: new Set([0, 1, 2]) },
    { method: 'GET', route: '/api/documents/fixture-doc-3', body: undefined, allowed: new Set([0, 1, 2]) },
    { method: 'PUT', route: '/api/documents/fixture-doc-4', body: { verified: true, provenance: 'Synthetic fixture rechecked' }, allowed: new Set([0]) },
    { method: 'DELETE', route: '/api/projects?id=fixture-project-empty', body: undefined, allowed: new Set([0]) },
    { method: 'DELETE', route: '/api/tasks?id=fixture-task-4', body: undefined, allowed: new Set([0]) }
  ];
  for (const [matrixIndex, item] of roleChecks.entries()) {
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const body = item.method === 'POST' && item.route === '/api/projects'
        ? { ...item.body, code: `FX-RBAC-${userIndex + 1}` }
        : item.body;
      const response = await request(item.method, item.route, users[userIndex].cookie, body);
      const expectedStatus = item.allowed.has(userIndex) ? item.allowedStatus ?? (item.method === 'POST' ? 201 : 200) : 403;
      const expected = response.status === expectedStatus;
      check(expected, `RBAC ${item.method} ${item.route}: profile ${userIndex + 1} -> ${response.status}`);
    }
  }

  const projectActions = ['assign_member', 'remove_member', 'attach_document', 'detach_document'];
  for (const action of projectActions) {
    for (let userIndex = 0; userIndex < users.length; userIndex++) {
      const body = { action, projectId: 'fixture-project-3' };
      if (action.endsWith('member')) body.userId = userIndex === 1 ? 'fixture-user-6' : 'fixture-user-5';
      if (action.endsWith('document')) body.docId = userIndex === 1 ? 'fixture-doc-5' : 'fixture-doc-4';
      const response = await request('POST', '/api/projects', users[userIndex].cookie, body);
      check(response.status === (userIndex === 0 ? 200 : 403), `RBAC project ${action}: profile ${userIndex + 1} -> ${response.status}`);
    }
  }

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const form = new FormData();
    form.append('file', new File(['synthetic upload fixture'], 'upload.txt', { type: 'text/plain' }));
    const response = await request('POST', '/api/documents', users[userIndex].cookie, form);
    check(response.status === 201, `Document upload succeeds without an antivirus service for profile ${userIndex + 1}`);
  }
  const uploadNames = (await fs.readdir(uploadsPath)).sort();
  const uploadedDocumentFiles = uploadNames.filter(name => /^doc-[0-9a-f-]{36}\.txt$/.test(name));
  check(uploadedDocumentFiles.length === users.length && ['fixture-3.txt', 'fixture-4.txt', 'fixture-5.txt'].every(name => uploadNames.includes(name)), 'Validated uploads are stored without scanner dependency and existing fixtures remain intact');

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const knowledgeId = userIndex === 1 ? 'fixture-knowledge-4' : 'fixture-knowledge-3';
    const response = await request('DELETE', `/api/knowledge?id=${knowledgeId}`, users[userIndex].cookie);
    check(response.status === (userIndex < 2 ? 200 : 403), `RBAC DELETE /api/knowledge: profile ${userIndex + 1} -> ${response.status}`);
  }
  const knowledgeAuditResponse = await request('GET', '/api/audit', users[0].cookie);
  const knowledgeAudit = await knowledgeAuditResponse.json();
  check(knowledgeAuditResponse.status === 200 && knowledgeAudit.some(log => log.action === 'BILIM TAHRIRLANDI') && knowledgeAudit.some(log => log.action === 'BILIM O‘CHIRILDI'), 'Knowledge edit/delete actions are recorded in the audit log');

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const documentId = userIndex === 1 ? 'fixture-doc-4' : 'fixture-doc-3';
    const response = await request('DELETE', `/api/documents/${documentId}`, users[userIndex].cookie);
    check(response.status === (userIndex === 0 ? 200 : 403), `RBAC DELETE /api/documents/:id: profile ${userIndex + 1} -> ${response.status}`);
  }

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const response = await request('GET', '/api/team/chat', users[userIndex].cookie);
    check(response.status === 200, `RBAC GET /api/team/chat: profile ${userIndex + 1} -> ${response.status}`);
  }

  const adminCanChat = await request('POST', '/api/team/chat', users[1].cookie, { content: 'synthetic', senderId: 'fixture-user-1', senderRole: 'ADMIN' });
  const adminChatMessage = await adminCanChat.json();
  check(adminCanChat.status === 201 && adminChatMessage.senderId === 'fixture-user-2' && adminChatMessage.senderRole === 'SUPER_ADMIN', 'Team chat identity fields come from the authenticated session');

  const rosterDir = path.join(testDir, 'empty-production');
  const rosterDatabasePath = path.join(rosterDir, 'database.json');
  const rosterReservation = net.createServer();
  rosterReservation.listen(0, '127.0.0.1');
  await once(rosterReservation, 'listening');
  const rosterPort = rosterReservation.address().port;
  await new Promise(resolve => rosterReservation.close(resolve));
  const rosterOrigin = `http://127.0.0.1:${rosterPort}`;
  const rosterServer = spawn(process.execPath, [nextCli, 'start', '-p', String(rosterPort)], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(rosterPort),
      LABCONTROL_DATABASE_FILE: rosterDatabasePath,
      LABCONTROL_SESSION_FILE: path.join(rosterDir, 'sessions.json'),
      LABCONTROL_UPLOADS_DIR: path.join(rosterDir, 'uploads'),
      LABCONTROL_CREDENTIALS_FILE: path.join(rosterDir, 'credentials.json'),
      LABCONTROL_DEMO_MODE: 'false',
      LABCONTROL_PUBLIC_ORIGIN: rosterOrigin,
      LABCONTROL_PASSWORD_HASHES_JSON: '{}',
      NEXT_TELEMETRY_DISABLED: '1'
    },
    stdio: 'ignore',
    windowsHide: true
  });
  try {
    await waitForServerAt(rosterServer, rosterOrigin);
    const unauthenticated = await fetch(`${rosterOrigin}/api/auth/session`, { headers: { origin: rosterOrigin, 'sec-fetch-site': 'same-origin' } });
    const noCredentials = await fetch(`${rosterOrigin}/api/auth/login`, {
      method: 'POST', headers: { origin: rosterOrigin, 'sec-fetch-site': 'same-origin', 'content-type': 'application/json' },
      body: JSON.stringify({ identifier: 'staff-01', password: 'fixture-password' })
    });
    const provisionedRoster = JSON.parse(await fs.readFile(rosterDatabasePath, 'utf8'));
    check(unauthenticated.status === 401 && provisionedRoster.users.length === 7, 'Empty production JSON store provisions all seven source roster profiles on first use');
    check(provisionedRoster.users[0].role === 'ADMIN' && provisionedRoster.users[1].role === 'SUPER_ADMIN' && provisionedRoster.users.slice(2).every(user => user.role === 'USER'), 'Provisioned production profile roles match the source role hierarchy');
    check(provisionedRoster.users.every(user => user.email === '' && !user.phone && user.identitySource === 'data/xodim.txt'), 'Provisioned accounts contain no guessed email, phone, or password data');
    check(noCredentials.status === 503, 'Roster profiles cannot sign in until approved Argon2id credentials are configured');
  } finally {
    if (rosterServer.exitCode === null) {
      rosterServer.kill('SIGTERM');
      await Promise.race([once(rosterServer, 'exit'), new Promise(resolve => setTimeout(resolve, 5000))]);
      if (rosterServer.exitCode === null) rosterServer.kill('SIGKILL');
    }
  }

  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const logout = await request('POST', '/api/auth/logout', users[userIndex].cookie);
    const revoked = await request('GET', '/api/auth/session', users[userIndex].cookie);
    check(logout.status === 200 && revoked.status === 401, `Server logout revokes profile ${userIndex + 1} session`);
  }

  const finalFixture = JSON.parse(await fs.readFile(databasePath, 'utf8'));
  check(!Object.hasOwn(finalFixture, 'currentUserId'), 'Legacy global currentUserId is excluded from the saved fixture database');
  console.log(`\nNatija: ${passed}/${passed} izolyatsiyalangan API/RBAC tekshiruvlari o‘tdi.`);
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 5000))]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
  await new Promise(resolve => ollamaMock.close(resolve));
  const resolved = path.resolve(testDir);
  if (path.basename(resolved).startsWith(`labcontrol-api-${process.pid}-`) && resolved.startsWith(path.resolve(os.tmpdir()))) await fs.rm(resolved, { recursive: true, force: true });
}
