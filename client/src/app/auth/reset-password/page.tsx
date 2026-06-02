import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
});

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password) {
      return NextResponse.json(
        { error: "Email, OTP, and new password are required." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Step 1: Verify OTP ──────────────────────────────────────────────────
    // Uses table: otp_codes, column: otp  (matching the send-otp route)
    const otpResult = await pool.query(
      `SELECT id FROM otp_codes
       WHERE email = $1
         AND otp   = $2
         AND used  = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail, otp.trim()]
    );

    if (otpResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

    const otpId = otpResult.rows[0].id;

    // ── Step 2: Hash new password ───────────────────────────────────────────
    const hashed = await bcrypt.hash(password, 12);

    // ── Step 3: Update password in users table ──────────────────────────────
    const updateResult = await pool.query(
      `UPDATE users
       SET password_hash = $1
       WHERE email = $2
       RETURNING id`,
      [hashed, normalizedEmail]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email address." },
        { status: 404 }
      );
    }

    // ── Step 4: Mark OTP as used ────────────────────────────────────────────
    await pool.query(
      `UPDATE otp_codes SET used = TRUE WHERE id = $1`,
      [otpId]
    );

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[reset-password]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}