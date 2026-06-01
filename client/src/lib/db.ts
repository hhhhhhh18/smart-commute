import { Pool } from "pg";

// Singleton pool — reused across hot-reloads in dev
const globalPool = globalThis as typeof globalThis & { _pgPool?: Pool };

if (!globalPool._pgPool) {
  globalPool._pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
}

export const pool = globalPool._pgPool;

// ── Run this once to create the tables ──
// Execute in psql or a migration script:
//
// CREATE TABLE IF NOT EXISTS users (
//   id          SERIAL PRIMARY KEY,
//   name        TEXT,
//   email       TEXT UNIQUE NOT NULL,
//   password    TEXT,                      -- null for Google-only accounts
//   email_verified BOOLEAN DEFAULT FALSE,
//   provider    TEXT DEFAULT 'credentials', -- 'credentials' | 'google'
//   created_at  TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE IF NOT EXISTS otp_codes (
//   id         SERIAL PRIMARY KEY,
//   email      TEXT NOT NULL,
//   code       TEXT NOT NULL,
//   expires_at TIMESTAMPTZ NOT NULL,
//   used       BOOLEAN DEFAULT FALSE,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );