import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';

/** Recreates the test database and applies migrations once per run. Needs `npm run db:up`. */
export default async function setup() {
  const admin = new pg.Client({ connectionString: 'postgres://playport:playport@localhost:5433/postgres' });
  await admin.connect();
  await admin.query('DROP DATABASE IF EXISTS playport_test WITH (FORCE)');
  await admin.query('CREATE DATABASE playport_test');
  await admin.end();

  const pool = new pg.Pool({ connectionString: 'postgres://playport:playport@localhost:5433/playport_test' });
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  await pool.end();
}
