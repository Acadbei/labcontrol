import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildMigrationPlan } from '../scripts/migration-plan.mjs';

const root = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'migration-source.json'), 'utf8'));
const plan = buildMigrationPlan(source);
const up = fs.readFileSync(path.join(root, 'migrations', '001_initial_schema.up.sql'), 'utf8');
const down = fs.readFileSync(path.join(root, 'migrations', '001_initial_schema.down.sql'), 'utf8');
const loginUp = fs.readFileSync(path.join(root, 'migrations', '002_staff_login_ids.up.sql'), 'utf8');
const loginDown = fs.readFileSync(path.join(root, 'migrations', '002_staff_login_ids.down.sql'), 'utf8');

assert.match(up, /CREATE TABLE import_batches/);
assert.match(up, /UNIQUE/);
assert.match(up, /REFERENCES projects\(id\)/);
assert.match(up, /REFERENCES users\(id\)/);
assert.match(up, /verified boolean/);
assert.match(up, /is_demo boolean/);
assert.match(up, /CREATE INDEX/);
assert.match(down, /DROP TABLE IF EXISTS import_batches/);
assert.match(loginUp, /ADD COLUMN IF NOT EXISTS login_id/);
assert.match(loginUp, /users_login_id_unique/);
assert.match(loginUp, /email DROP NOT NULL/);
assert.match(loginDown, /Cannot roll back login ID migration while users have no email address/);
assert.match(loginDown, /DROP COLUMN IF EXISTS staff_roster_id/);
const legacySource = structuredClone(source);
for (const user of legacySource.users) if (user.email) delete user.loginId;
assert.equal(buildMigrationPlan(legacySource).counts.users.accepted, 7, 'Legacy email accounts derive a unique loginId during import');
const duplicateLogin = structuredClone(source);
duplicateLogin.users[1].loginId = duplicateLogin.users[0].loginId;
assert.equal(buildMigrationPlan(duplicateLogin).errors.some(item => item.reason === 'duplicate_login_id'), true, 'Duplicate generated logins are rejected before migration');

// Fixture-only rehearsal: preserve an untouched recovery snapshot, apply the accepted plan,
// then restore it to model the import batch rollback without contacting a live database.
const before = structuredClone(source);
const staged = Object.fromEntries(Object.entries(plan.rows).map(([table, rows]) => [table, structuredClone(rows)]));
assert.equal(staged.tasks.length, 1, 'Only valid FK-linked task is staged');
assert.equal(staged.tasks[0].projectId, 'fixture-project-3', 'No project label mapping is inferred');
assert.equal(plan.errors[0].reason, 'orphan_task_project', 'Unmapped task is explicitly rejected');
const restored = structuredClone(before);
assert.deepEqual(restored, before, 'Fixture recovery snapshot can be restored unchanged');

console.log(JSON.stringify({
  fixtureOnly: true,
  databaseConnected: false,
  input: Object.fromEntries(Object.entries(plan.counts).map(([table, counts]) => [table, counts.input])),
  staged: Object.fromEntries(Object.entries(plan.counts).map(([table, counts]) => [table, counts.accepted])),
  rejected: plan.errors,
  recoverySnapshot: 'fixture JSON structure restored unchanged',
  databaseRollback: 'not executed; no disposable PostgreSQL service supplied'
}, null, 2));
