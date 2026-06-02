
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const { email, code, password } = body ?? {};

    if (!email || !code || !password) {
      return NextResponse.json(
        { error: "Email, code, and password are required." },
        { status: 400 }
      );
    }

    const lower = email.toLowerCase().trim();

    // Password strength validation
    const strong =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);

    if (!strong) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." },
        { status: 400 }
      );
    }

    // Verify OTP — must be unused and not expired
    const { rows } = await pool.query(
      `SELECT * FROM otp_codes
       WHERE email = $1
         AND otp   = $2
         AND used  = FALSE
         AND expires_at > NOW()`,
      [lower, code.trim()]
    );

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Invalid or expired code. Please request a new one." },
        { status: 400 }
      );
    }

    // Hash new password
    const hash = await bcrypt.hash(password, 12);

    // Update password + mark OTP used atomically
    await pool.query("BEGIN");
    try {
      await pool.query(
        "UPDATE users SET password = $1 WHERE email = $2",
        [hash, lower]
      );
      await pool.query(
        "UPDATE otp_codes SET used = TRUE WHERE email = $1",
        [lower]
      );
      await pool.query("COMMIT");
    } catch (txErr) {
      await pool.query("ROLLBACK");
      throw txErr;
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("[reset-password] error:", err?.message ?? err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
