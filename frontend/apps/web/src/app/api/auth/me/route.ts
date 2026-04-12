import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    return NextResponse.json({ role: "viewer", email: null }, { status: 401 });
  }
  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ role: "viewer", email: null }, { status: 401 });
  }
  return NextResponse.json({ role: payload.role ?? "viewer", email: payload.email });
}
