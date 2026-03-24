import type { Metadata } from "next";
import "../index.css";
import Providers from "@/components/providers";
import Sidebar from "@/components/sidebar";
import DashboardHeader from "@/components/dashboard-header";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const metadata: Metadata = {
  title: "GradPQC — Quantum Migration Intelligence",
  description: "Cryptographic inventory and quantum migration intelligence platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let email: string | undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          {email ? (
            <>
              <Sidebar />
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