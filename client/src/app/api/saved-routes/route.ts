import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { pool } from "@/lib/db";

// GET — list all saved routes for the logged-in user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rows: [user] } = await pool.query(
    "SELECT id FROM users WHERE email = $1", [session.user.email]
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { rows } = await pool.query(
    "SELECT * FROM saved_routes WHERE user_id = $1 ORDER BY created_at DESC",
    [user.id]
  );
  return NextResponse.json(rows);
}

// POST — save a new route
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { from_name, to_name, from_lat, from_lng, to_lat, to_lng } = await req.json();
  if (!from_name || !to_name)
    return NextResponse.json({ error: "from_name and to_name are required" }, { status: 400 });

  const { rows: [user] } = await pool.query(
    "SELECT id FROM users WHERE email = $1", [session.user.email]
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Prevent duplicates
  const { rows: existing } = await pool.query(
    "SELECT id FROM saved_routes WHERE user_id=$1 AND from_name=$2 AND to_name=$3",
    [user.id, from_name, to_name]
  );
  if (existing.length > 0)
    return NextResponse.json({ error: "Route already saved" }, { status: 409 });

  const { rows: [saved] } = await pool.query(
    `INSERT INTO saved_routes (user_id, from_name, to_name, from_lat, from_lng, to_lat, to_lng)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [user.id, from_name, to_name, from_lat ?? null, from_lng ?? null, to_lat ?? null, to_lng ?? null]
  );
  return NextResponse.json(saved, { status: 201 });
}

// DELETE — remove a saved route by id
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { rows: [user] } = await pool.query(
    "SELECT id FROM users WHERE email = $1", [session.user.email]
  );
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await pool.query(
    "DELETE FROM saved_routes WHERE id=$1 AND user_id=$2", [id, user.id]
  );
  return NextResponse.json({ success: true });
}