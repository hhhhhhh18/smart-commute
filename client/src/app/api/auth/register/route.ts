import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password)
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });

    if (password.length < 8)
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });

    const lower = email.toLowerCase();
    const { rows } = await pool.query("SELECT id, provider FROM users WHERE email = $1", [lower]);

    if (rows[0]) {

      // Existing Google account -> attach password
      if (rows[0].provider === "google" && !rows[0].password_hash) {
    
        const hash = await bcrypt.hash(password, 12);
    
        await pool.query(
          `UPDATE users
           SET password_hash = $1
           WHERE email = $2`,
          [hash, lower]
        );
    
        return NextResponse.json({
          success: true,
          message: "Password added successfully. You can now login with both Google and password."
        });
      }
    
      return NextResponse.json({
        error: "An account with this email already exists."
      }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, email_verified, provider)
       VALUES ($1, $2, $3, FALSE, 'credentials')`,
      [name.trim(), lower, hash]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}