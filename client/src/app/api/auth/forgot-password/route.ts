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
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
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

    // If user has no password yet
    if (!rows[0].password_hash) {
      return NextResponse.json(
        {
          error:
            "This account does not have a password yet. Please create one first.",
        },
        { status: 400 }
      );
    }

    // Rate limit: max 3 OTPs in 10 mins
    const { rows: recent } = await pool.query(
      `SELECT COUNT(*) FROM otps
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

    const otp = generateOtp();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    // Insert/update OTP
    await pool.query(
      `INSERT INTO otps (email, otp, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET
         otp = $2,
         expires_at = $3,
         used = FALSE,
         created_at = NOW()`,
      [lower, otp, expires]
    );

    // Send OTP email
    await sendOtpEmail(lower, otp);

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[forgot-password]", err);

    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}