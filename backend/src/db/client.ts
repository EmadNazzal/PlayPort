import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { config } from '../shared/config.js';
import * as schema from './schema/index.js';

export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });

export const db = drizzle(pool, { schema, casing: 'snake_case' });

export type Db = typeof db;
/** A transaction handle or the db itself — services accept either. */
export type DbOrTx = Db | Parameters<Parameters<Db['transaction']>[0]>[0];
