import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { sendOtpEmail } from "@/lib/mailer";

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const lower = email.toLowerCase();

    // Check account exists and is a credentials account
    const { rows } = await pool.query("SELECT id, provider FROM users WHERE email = $1", [lower]);
    if (!rows[0]) {
      // Return success anyway to prevent email enumeration
      return NextResponse.json({ success: true });
    }
    if (rows[0].provider === "google") {
      return NextResponse.json({
        error: "This account uses Google sign-in. Please sign in with Google instead.",
      }, { status: 400 });
    }

    // Rate-limit: max 3 OTPs per email per 10 minutes
    const { rows: recent } = await pool.query(
      `SELECT COUNT(*) FROM otps WHERE email = $1 AND created_at > NOW() - INTERVAL '10 minutes'`,
      [lower]
    );
    if (parseInt(recent[0].count) >= 3) {
      return NextResponse.json({ error: "Too many requests. Please wait 10 minutes." }, { status: 429 });
    }

    const otp     = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Upsert — same pattern as send-otp route
    await pool.query(
      `INSERT INTO otps (email, otp, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET otp = $2, expires_at = $3, used = FALSE, created_at = NOW()`,
      [lower, otp, expires]
    );

    await sendOtpEmail(lower, otp);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}