import fs from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const migrationDir = path.join(process.cwd(), 'migrations');
const command = process.argv[2] || '--dry-run';

async function getMigrations() {
  const files = (await fs.readdir(migrationDir)).filter(name => /^\d+_[a-z0-9_-]+\.up\.sql$/i.test(name)).sort();
  return Promise.all(files.map(async file => ({ name: file.replace(/\.up\.sql$/i, ''), up: await fs.readFile(path.join(migrationDir, file), 'utf8') })));
}

async function main() {
  const migrations = await getMigrations();
  if (command === '--dry-run') {
    console.log(JSON.stringify({ mode: 'dry-run', databaseConnected: false, pendingMigrations: migrations.map(item => item.name), requires: 'DATABASE_URL and explicit --up to change a PostgreSQL database' }, null, 2));
    return;
  }
  if (!['--up', '--down'].includes(command) || (command === '--down' && !process.argv[3])) throw new Error('Use --dry-run, --up, or --down <migration-name>');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for database changes');
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000, application_name: 'labcontrol-migration' });
  await client.connect();
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const applied = (await client.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(row => row.name);
    if (command === '--up') {
      for (const migration of migrations.filter(item => !applied.includes(item.name))) {
        await client.query('BEGIN');
        try {
          await client.query(migration.up);
          await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [migration.name]);
          await client.query('COMMIT');
          console.log(`Applied ${migration.name}`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      }
      if (migrations.every(item => applied.includes(item.name))) console.log('No pending migrations');
      return;
    }

    const name = process.argv[3];
    const latest = applied.at(-1);
    if (name !== latest) throw new Error('Only the most recently applied migration can be rolled back');
    const migration = migrations.find(item => item.name === name);
    if (!migration) throw new Error('Unknown migration');
    const down = await fs.readFile(path.join(migrationDir, `${name}.down.sql`), 'utf8');
    await client.query('BEGIN');
    try {
      await client.query(down);
      await client.query('DELETE FROM schema_migrations WHERE name = $1', [name]);
      await client.query('COMMIT');
      console.log(`Rolled back ${name}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } finally {
    await client.end();
  }
}

main().catch(error => {
  console.error(error?.code ? `PostgreSQL migration failed (${error.code})` : `Migration stopped: ${error.message}`);
  process.exitCode = 1;
});
