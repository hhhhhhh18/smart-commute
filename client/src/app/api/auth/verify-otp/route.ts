import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) return NextResponse.json({ error: "Email and code are required." }, { status: 400 });

    const lower = email.toLowerCase();

    // ── FIX: column is "otp" not "code"; PK is "email" not "id" ──
    const { rows } = await pool.query(
      `SELECT * FROM otp_codes
       WHERE email = $1 AND otp = $2 AND used = FALSE AND expires_at > NOW()`,
      [lower, code.trim()]
    );

    if (!rows[0]) return NextResponse.json({ error: "Invalid or expired code." }, { status: 400 });

    // Mark OTP used (PK is email, there is no id column)
    await pool.query("UPDATE otp_codes SET used = TRUE WHERE email = $1", [lower]);
    await pool.query("UPDATE users SET email_verified = TRUE WHERE email = $1", [lower]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[verify-otp]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}