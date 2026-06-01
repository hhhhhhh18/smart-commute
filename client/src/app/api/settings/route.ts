import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

// GET — fetch settings for logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows: [user] } = await pool.query(
    "SELECT id FROM users WHERE email = $1", [session.user.email]
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { rows: [settings] } = await pool.query(
    "SELECT * FROM user_settings WHERE user_id = $1", [user.id]
  );

  // Return defaults if no settings row yet
  return NextResponse.json(settings ?? {
    user_id: user.id,
    home_name: null, home_lat: null, home_lng: null,
    work_name: null, work_lat: null, work_lng: null,
    default_mode: "bus",
  });
}

// PUT — upsert settings
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { home_name, home_lat, home_lng, work_name, work_lat, work_lng, default_mode } = body;

  const { rows: [user] } = await pool.query(
    "SELECT id FROM users WHERE email = $1", [session.user.email]
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { rows: [updated] } = await pool.query(
    `INSERT INTO user_settings (user_id, home_name, home_lat, home_lng, work_name, work_lat, work_lng, default_mode, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       home_name=$2, home_lat=$3, home_lng=$4,
       work_name=$5, work_lat=$6, work_lng=$7,
       default_mode=$8, updated_at=NOW()
     RETURNING *`,
    [user.id, home_name ?? null, home_lat ?? null, home_lng ?? null,
     work_name ?? null, work_lat ?? null, work_lng ?? null, default_mode ?? "bus"]
  );
  return NextResponse.json(updated);
}