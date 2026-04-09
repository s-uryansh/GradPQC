import type { Metadata } from "next";
import "../index.css";
import Providers from "@/components/providers";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import { UserProvider } from "@/components/user-context";
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
  let role = "viewer";

  if (token) {
    const payload = decodeJwt(token);
    if (payload && payload.email) {
      email = payload.email;
      role = payload.role || "viewer";
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {email ? (
            <UserProvider user={{ email, role }}>
              <Sidebar />
              <DashboardHeader email={email} />
              <main className="ml-64 mt-14 min-h-[calc(100vh-3.5rem)] p-6">
                {children}
              </main>
            </UserProvider>
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
