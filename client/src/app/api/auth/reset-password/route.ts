import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json();

    if (!email || !otp || !password)
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });

    if (password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const lower = email.toLowerCase();

    // Verify OTP — match your schema: column is "otp", not "code"
    const { rows } = await pool.query(
      `SELECT * FROM otp_codes
       WHERE email = $1
         AND otp = $2
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [lower, otp.trim()]
    );

    if (!rows[0]) {
      return NextResponse.json({ error: "Invalid or expired code. Please try again." }, { status: 400 });
    }

    // Mark OTP as used
    await pool.query(
      "UPDATE otp_codes SET used = TRUE WHERE email = $1",
      [lower]
    );

    // Hash new password and update user — column is "password" (added via ALTER TABLE)
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      "UPDATE users SET password = $1 WHERE email = $2",
      [hash, lower]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[reset-password]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}