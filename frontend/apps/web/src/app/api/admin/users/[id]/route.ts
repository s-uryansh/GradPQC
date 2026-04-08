import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import pool from "@/lib/db";

const ALLOWED_ROLES = ["analyst", "viewer"] as const;
type AllowedRole = (typeof ALLOWED_ROLES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "admin") {
    return NextResponse.json({ error: "Forbidden – admin role required" }, { status: 403 });
  }

  let body: { role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { role } = body;
  if (!role || !ALLOWED_ROLES.includes(role as AllowedRole)) {
    return NextResponse.json(
      { error: `Invalid role. Allowed values: ${ALLOWED_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    // Prevent changing another admin's role
    const [targetRows] = await pool.query(
      "SELECT id, role FROM user WHERE id = ?",
      [params.id],
    );
    const target = (targetRows as { id: string; role: string }[])[0];
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (target.role === "admin") {
      return NextResponse.json(
        { error: "Cannot change the role of an admin account" },
        { status: 403 },
      );
    }

    await pool.query("UPDATE user SET role = ? WHERE id = ?", [role, params.id]);
    return NextResponse.json({ message: "Role updated", id: params.id, role });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
