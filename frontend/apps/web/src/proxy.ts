import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const { pathname } = req.nextUrl;
  const isAuthPage = pathname.startsWith("/login");
  const isAdminPage = pathname.startsWith("/admin");

  let payload = null;
  if (token) {
    payload = await verifyToken(token);
  }

  const isValid = !!payload;

  // Global Auth Guard
  if (!isValid && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Prevent Auth Page access if logged in
  if (isValid && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // RBAC: Admin Guard (from old middleware)
  if (isAdminPage) {
    if (!payload || payload.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};