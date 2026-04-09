"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Database,
  Search,
  FileText,
  Shield,
  Star,
  BarChart3,
  Trophy,
  Calculator,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/components/user-context";

const navItems = [
  { href: "/",              label: "Home",             icon: Home },
  { href: "/inventory",     label: "Asset Inventory",  icon: Database },
  { href: "/discovery",     label: "Asset Discovery",  icon: Search },
  { href: "/cbom",          label: "CBOM",             icon: FileText },
  { href: "/posture",       label: "Posture of PQC",   icon: Shield },
  { href: "/cyber-rating",  label: "Cyber Rating",     icon: Star },
  { href: "/competitor",    label: "Benchmarking",     icon: Trophy },
  { href: "/roi",           label: "Migration ROI",    icon: Calculator },
  { href: "/reporting",     label: "Reporting",        icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = useUser();
  const visibleItems = role === "viewer"
    ? navItems.filter(item => item.href !== "/reporting")
    : navItems;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#8B1A1A] flex flex-col z-40">
      <div className="flex items-center justify-center py-6 border-b border-white/20">
        <div className="text-center">
          <div className="text-white font-bold text-xl tracking-wide">PQC-Ready</div>
          <div className="text-amber-300 font-bold text-2xl tracking-wider">pnb</div>
        </div>
      </div>

      <nav className="flex-1 py-4">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href as any}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors",
                active
                  ? "bg-amber-500 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-white/20">
        <p className="text-white/40 text-xs">PSB Hackathon 2026</p>
        <p className="text-white/40 text-xs">PNB Cybersecurity</p>
      </div>
    </aside>
  );
}