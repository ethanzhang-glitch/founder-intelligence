import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const accounts=sqliteTable("accounts",{userId:text("user_id").primaryKey(),document:text("document").notNull(),revision:integer("revision").notNull().default(0),updatedAt:text("updated_at").notNull()});
export const authUsers=sqliteTable('auth_users',{id:text('id').primaryKey(),username:text('username').notNull().unique(),passwordHash:text('password_hash').notNull(),recoveryHash:text('recovery_hash').notNull(),authVersion:integer('auth_version').notNull().default(0),createdAt:text('created_at').notNull()});
export const authSessions=sqliteTable('auth_sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull(),authVersion:integer('auth_version').notNull(),expiresAt:integer('expires_at').notNull()});
export const authLimits=sqliteTable('auth_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),expiresAt:integer('expires_at').notNull()});
