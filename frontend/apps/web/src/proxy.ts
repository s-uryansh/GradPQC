import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login");

  let isValid = false;

  if (token) {
    const payload = await verifyToken(token);
    isValid = !!payload;
  }

  if (!isValid && !isAuthPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isValid && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};