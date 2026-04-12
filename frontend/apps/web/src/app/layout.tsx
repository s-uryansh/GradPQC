import type { Metadata } from "next";
import "../index.css";
import Providers from "@/components/providers";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "GradPQC - Quantum Migration Intelligence",
  description: "Cryptographic inventory and quantum migration intelligence platform",
};

function decodeJwt(token: string) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch (e) {
    return null;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  let email: string | undefined;
  let role: string = "viewer";

  if (token) {
    const payload = decodeJwt(token);
    if (payload) {
      if (payload.email) email = payload.email;
      if (payload.role) role = payload.role;
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {email ? (
            <>
              <Sidebar role={role} />
              <DashboardHeader email={email} />
              <main className="ml-64 mt-14 min-h-[calc(100vh-3.5rem)] p-6">
                {children}
              </main>
            </>
          ) : (
            <main className="min-h-screen">
              {children}
            </main>
          )}
        </Providers>
      </body>
    </html>
  );
}
