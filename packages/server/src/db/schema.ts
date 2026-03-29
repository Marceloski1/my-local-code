import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolName: text('tool_name'),
  toolArgs: text('tool_args'),
  toolResult: text('tool_result'),
  sequence: integer('sequence').notNull(),
  createdAt: text('created_at').notNull(),
});

export const config = sqliteTable('config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const sessionMetadata = sqliteTable('session_metadata', {
  id: text('id').primaryKey(),
  sessionId: text('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdAt: text('created_at').notNull(),
});
