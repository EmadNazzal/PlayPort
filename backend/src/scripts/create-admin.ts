/**
 * Creates (or promotes) a platform admin.
 *   ADMIN_EMAIL=you@playport.gg ADMIN_PASSWORD='long-passphrase' npm run create-admin
 */
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, pool } from '../db/client.js';
import { userRoles, users } from '../db/schema/index.js';
import { hashPassword } from '../modules/auth/index.js';
import { zEmail, zPassword } from '../shared/validation.js';

const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = z
  .object({ ADMIN_EMAIL: zEmail, ADMIN_PASSWORD: zPassword })
  .parse(process.env);

const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
const userId =
  existing?.id ??
  (await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword(password), displayName: 'Admin', emailVerifiedAt: new Date() })
    .returning({ id: users.id }))[0]!.id;

await db.insert(userRoles).values({ userId, role: 'admin' }).onConflictDoNothing();
console.log(`${existing ? 'Promoted' : 'Created'} admin ${email}`);
await pool.end();
