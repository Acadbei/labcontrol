import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { buildMigrationPlan } from './migration-plan.mjs';

const args = process.argv.slice(2);
const option = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const sourcePath = option('--source');
const sourceLabel = option('--source-label');
const operator = option('--operator');
const rollbackId = option('--rollback');
const shouldCommit = args.includes('--commit');
const allowRejects = args.includes('--allow-rejects');
const markDemo = args.includes('--mark-demo');

const tables = ['project_members', 'document_chunks', 'team_messages', 'chat_messages', 'audit_logs', 'knowledge_items', 'tasks', 'documents', 'projects', 'users', 'system_settings'];
const countTables = ['users', 'projects', 'project_members', 'documents', 'document_chunks', 'tasks', 'knowledge_items', 'audit_logs', 'chat_messages', 'team_messages', 'system_settings'];

async function insert(client, table, columns, values) {
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  await client.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`, values);
}

function dateOrNull(value) { return value ? new Date(value) : null; }
function json(value) { return JSON.stringify(value ?? null); }
async function readCounts(client) {
  const counts = {};
  for (const table of countTables) counts[table] = Number((await client.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count);
  return counts;
}

async function rollback() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for rollback');
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, application_name: 'labcontrol-import' });
  await client.connect();
  try {
    const before = await readCounts(client);
    await client.query('BEGIN');
    try {
      const batch = await client.query('SELECT id, status FROM import_batches WHERE id = $1 FOR UPDATE', [rollbackId]);
      if (!batch.rowCount || batch.rows[0].status !== 'committed') throw new Error('Committed import batch not found');
      for (const table of tables) await client.query(`DELETE FROM ${table} WHERE imported_batch_id = $1`, [rollbackId]);
      await client.query("UPDATE import_batches SET status = 'rolled_back', completed_at = now() WHERE id = $1", [rollbackId]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    const after = await readCounts(client);
    console.log(JSON.stringify({ mode: 'rollback', batchId: rollbackId, before, after, batchRowsRemoved: Object.fromEntries(countTables.map(table => [table, before[table] - after[table]])) }, null, 2));
  } finally { await client.end(); }
}

async function importPlan(plan, source, checksum) {
  if (!process.env.DATABASE_URL) throw new Error('--commit requires DATABASE_URL');
  if (plan.totals.rejected && !allowRejects) throw new Error('Rejected rows exist; inspect the report, fix source data, or explicitly pass --allow-rejects');
  if (plan.totals.piiMismatchCount) throw new Error('PII/name mismatches must be reconciled before commit');
  if (plan.totals.unknownFieldCount && !allowRejects) throw new Error('Unknown fields exist; explicitly review them and pass --allow-rejects to omit their rows');
  if (!sourceLabel || !operator) throw new Error('--commit requires --source-label and --operator');
  if (path.basename(sourcePath).toLowerCase() === 'database.json' && !markDemo) throw new Error('Legacy database.json requires --mark-demo; demo rows cannot be imported as verified production data');

  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, application_name: 'labcontrol-import' });
  await client.connect();
  const batchId = randomUUID();
  try {
    const migrationState = await client.query("SELECT to_regclass('public.import_batches') AS table_name");
    if (!migrationState.rows[0].table_name) throw new Error('Apply PostgreSQL migrations before importing');
    const before = await readCounts(client);
    await client.query('BEGIN');
    try {
      await insert(client, 'import_batches', ['id', 'source_checksum', 'source_label', 'status', 'counts', 'operator'], [batchId, checksum, sourceLabel, 'committed', json(plan.counts), operator]);
      for (const row of plan.rows.users) {
        const email = typeof row.email === 'string' && row.email.trim() ? row.email.trim() : null;
        const loginId = (row.loginId || email || '').trim().toLowerCase();
        await insert(client, 'users', ['id','login_id','staff_roster_id','name','email','normalized_email','role','position','avatar','permissions','phone','specialty','source','owner_id','verified','is_demo','imported_batch_id'], [row.id,loginId,row.staffRosterId || null,row.name,email,email?.toLowerCase() || null,row.role,row.position,row.avatar || null,row.permissions || [],row.phone || null,row.specialty || null,row.source || row.identitySource || sourceLabel,row.ownerId || null,row.verified === true && !markDemo,markDemo || row.isDemo === true,batchId]);
      }
      for (const row of plan.rows.projects) await insert(client, 'projects', ['id','name','code','description','status','priority','start_date','deadline','manager_id','documents_count','tasks_count','progress_percent','technical_parameters','overview','decisions','tags','source','owner_id','verified','is_demo','created_at','updated_at','imported_batch_id'], [row.id,row.name,row.code,row.description || '',row.status,row.priority,row.startDate || null,row.deadline || null,row.managerId,row.documentsCount || 0,row.tasksCount || 0,row.progressPercent || 0,json(row.technicalParameters || []),row.overview || '',json(row.decisions || []),row.tags || [],row.source || sourceLabel,row.ownerId || null,row.verified === true && !markDemo,markDemo || row.isDemo === true,dateOrNull(row.createdAt),dateOrNull(row.updatedAt),batchId]);
      for (const row of plan.rows.projects) for (const userId of new Set(row.teamIds || [])) await insert(client, 'project_members', ['project_id','user_id','imported_batch_id'], [row.id,userId,batchId]);
      for (const row of plan.rows.documents) await insert(client, 'documents', ['id','title','original_name','file_type','file_size','storage_path','project_id','uploaded_by_id','uploaded_by_name','uploaded_at','version','summary','tags','technical_parameters','page_count','slide_count','word_count','is_indexed','chunks_count','verified','provenance','verified_by_id','verified_by_name','verified_at','source','owner_id','is_demo','imported_batch_id'], [row.id,row.title,row.originalName,row.fileType,row.fileSize || 0,null,row.projectId || null,row.uploadedById,row.uploadedByName || '',dateOrNull(row.uploadedAt),row.version || 1,row.summary || '',row.tags || [],json(row.technicalParameters || []),row.pageCount ?? null,row.slideCount ?? null,row.wordCount ?? null,row.isIndexed === true,row.chunksCount || 0,row.verified === true && !markDemo,markDemo ? 'Demo archive; not verified' : row.provenance || null,markDemo ? null : row.verifiedById || null,markDemo ? null : row.verifiedByName || null,markDemo ? null : dateOrNull(row.verifiedAt),row.source || sourceLabel,row.ownerId || null,markDemo || row.isDemo === true,batchId]);
      for (const row of plan.rows.chunks) await insert(client, 'document_chunks', ['id','doc_id','chunk_index','content','page_or_slide','section_title','embedding','imported_batch_id'], [row.id,row.docId,row.chunkIndex,row.text,row.pageOrSlide ?? null,row.sectionTitle || null,row.embedding ? json(row.embedding) : null,batchId]);
      for (const row of plan.rows.tasks) await insert(client, 'tasks', ['id','title','description','project_id','assignee_id','creator_id','priority','deadline','status','ai_summary','comments','tags','source','owner_id','verified','is_demo','created_at','updated_at','imported_batch_id'], [row.id,row.title,row.description || '',row.projectId,row.assigneeId,row.creatorId,row.priority,row.deadline,row.status,row.aiSummary || null,json(row.comments || []),row.tags || [],row.source || sourceLabel,row.ownerId || null,row.verified === true && !markDemo,markDemo || row.isDemo === true,dateOrNull(row.createdAt),dateOrNull(row.updatedAt),batchId]);
      for (const row of plan.rows.knowledge) await insert(client, 'knowledge_items', ['id','title','category','content','project_id','technical_parameters','tags','updated_at','owner_id','source','verified','is_demo','imported_batch_id'], [row.id,row.title,row.category,row.content,row.projectId || null,json(row.technicalParams || []),row.tags || [],dateOrNull(row.updatedAt) || new Date(),row.ownerId || null,row.source || sourceLabel,row.verified === true && !markDemo,markDemo || row.isDemo === true,batchId]);
      const knownUserIds = new Set(plan.rows.users.map(row => row.id));
      for (const row of plan.rows.auditLogs) await insert(client, 'audit_logs', ['id','user_id','source_actor_id','user_name','action','object_name','details','ip','occurred_at','status','source','is_demo','imported_batch_id'], [row.id,knownUserIds.has(row.userId) ? row.userId : null,row.userId || null,row.userName || '',row.action || '',row.object || '',row.details || '',row.ip || '',dateOrNull(row.timestamp) || new Date(),row.status || 'WARNING',sourceLabel,markDemo || row.isDemo === true,batchId]);
      for (const row of plan.rows.chatMessages) await insert(client, 'chat_messages', ['id','role','content','sender_id','occurred_at','citations','action_proposal','is_personal','imported_batch_id'], [row.id,row.role,row.content,row.senderId,dateOrNull(row.timestamp) || new Date(),json(row.citations || []),json(row.actionProposal),row.isPersonal !== false,batchId]);
      for (const row of plan.rows.teamMessages) await insert(client, 'team_messages', ['id','sender_id','sender_name','sender_position','sender_role','content','occurred_at','category','imported_batch_id'], [row.id,row.senderId,row.senderName,row.senderPosition,row.senderRole,row.content,dateOrNull(row.timestamp) || new Date(),row.category || 'general',batchId]);
      if (source.settings && typeof source.settings === 'object') {
        const safeSettings = Object.fromEntries(['aiProvider','modelName','laboratoryName','secondBrainTitle'].filter(key => Object.hasOwn(source.settings, key)).map(key => [key, source.settings[key]]));
        await insert(client, 'system_settings', ['setting_key','setting_value','imported_batch_id'], ['core',json(safeSettings),batchId]);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    const after = await readCounts(client);
    console.log(JSON.stringify({ mode: 'committed', batchId, before, after, counts: plan.counts, idMapping: 'Legacy string IDs preserved as-is; no inferred project remapping' }, null, 2));
  } finally { await client.end(); }
}

async function main() {
  if (rollbackId) return rollback();
  if (!sourcePath) throw new Error('Provide --source <fixture-or-approved-export.json>');
  const absoluteSource = path.resolve(sourcePath);
  const raw = await fs.readFile(absoluteSource);
  const source = JSON.parse(raw.toString('utf8'));
  const plan = buildMigrationPlan(source);
  const checksum = createHash('sha256').update(raw).digest('hex');
  const report = { mode: shouldCommit ? 'commit-preflight' : 'dry-run', source: path.basename(absoluteSource), checksum, rows: plan.counts, totals: plan.totals, unknownFields: plan.unknownFields, piiMismatches: plan.piiMismatches.length, rejects: plan.errors, idMapping: 'Legacy string IDs are preserved; no label-based project remapping', demoRowsWillBeMarked: markDemo };
  console.log(JSON.stringify(report, null, 2));
  if (shouldCommit) await importPlan(plan, source, checksum);
}

main().catch(error => {
  console.error(error?.code ? `PostgreSQL import failed (${error.code})` : `Import stopped: ${error.message}`);
  process.exitCode = 1;
});
