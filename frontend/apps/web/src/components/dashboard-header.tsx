"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  email?: string;
}

export default function DashboardHeader({ email = "hackathon_user" }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30">
      <div className="flex items-center gap-3">
        <div className="text-[#8B1A1A] font-bold text-lg">
          PNB Cybersecurity Hackathon 2026
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span>Welcome User: <strong>{email}..!</strong></span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="text-[#8B1A1A] border-[#8B1A1A] hover:bg-[#8B1A1A] hover:text-white"
        >
          <LogOut className="h-4 w-4 mr-1" />
          Logout
        </Button>
      </div>
    </header>
  );
}