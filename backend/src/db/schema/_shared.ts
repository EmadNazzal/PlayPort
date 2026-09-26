import { bigint, customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/** Case-insensitive text (requires the citext extension, enabled in the first migration). */
export const citext = customType<{ data: string }>({ dataType: () => 'citext' });

export const id = () => uuid().primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/** Solana amounts are stored in lamports (1 SOL = 1e9 lamports) as bigint — never floats. */
export const lamports = () => bigint({ mode: 'bigint' });
