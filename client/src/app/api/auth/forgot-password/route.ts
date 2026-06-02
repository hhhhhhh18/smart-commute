
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { sendOtpEmail } from "@/lib/mailer";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const lower = email.toLowerCase();

    // Check if account exists
    const { rows } = await pool.query(
      "SELECT id, password_hash FROM users WHERE email = $1",
      [lower]
    );

    // Return success anyway to prevent email enumeration
    if (!rows[0]) {
      return NextResponse.json({ success: true });
    }

    // If user has no password yet (Google-only account)
    if (!rows[0].password_hash) {
      return NextResponse.json(
        { error: "This account does not have a password yet. Please create one first." },
        { status: 400 }
      );
    }

    // ── FIX: Rate limit using otp_codes (not otps) ──────────────────────────
    const { rows: recent } = await pool.query(
      `SELECT COUNT(*) FROM otp_codes
       WHERE email = $1
         AND created_at > NOW() - INTERVAL '10 minutes'`,
      [lower]
    );

    if (parseInt(recent[0].count) >= 3) {
      return NextResponse.json(
        { error: "Too many requests. Please wait 10 minutes." },
        { status: 429 }
      );
    }

    const otp     = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // ── FIX: Insert into otp_codes (same table reset-password reads from) ───
    // Invalidate any previous unused OTPs for this email first
    await pool.query(
      `UPDATE otp_codes SET used = TRUE WHERE email = $1 AND used = FALSE`,
      [lower]
    );

    // Insert fresh OTP
    await pool.query(
      `INSERT INTO otp_codes (email, otp, expires_at, used)
       VALUES ($1, $2, $3, FALSE)`,
      [lower, otp, expires]
    );

    // Send OTP email
    await sendOtpEmail(lower, otp);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
