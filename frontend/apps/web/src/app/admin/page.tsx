"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users } from "lucide-react";

interface UserRow {
  id: string;
  email: string;
  role: string;
}

const ROLE_STYLES: Record<string, string> = {
  admin:   "bg-red-100 text-red-700",
  analyst: "bg-blue-100 text-blue-700",
  viewer:  "bg-gray-100 text-gray-600",
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async r => {
        if (r.status === 401) throw new Error("Unauthenticated – please log in.");
        if (r.status === 403) throw new Error("Access denied. Admin role required.");
        if (!r.ok) throw new Error("Failed to load users.");
        return r.json();
      })
      .then(setUsers)
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function updateRole(id: string, newRole: "analyst" | "viewer") {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to update role.");
      }
      setUsers(prev => prev.map(u => (u.id === id ? { ...u, role: newRole } : u)));
      toast.success(`Role updated to "${newRole}"`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="h-6 w-6 text-[#8B1A1A]" />
          Admin Panel
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage user roles and access control (RBAC)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-amber-500" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-gray-500 text-sm p-6">Loading users…</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500 text-sm p-6">No users found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left py-3 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                    Current Role
                  </th>
                  <th className="text-left py-3 px-6 font-semibold text-gray-600 text-xs uppercase tracking-wide">
                    Change Role
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-6 text-gray-800 font-medium">{user.email}</td>
                    <td className="py-3 px-6">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          ROLE_STYLES[user.role] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3 px-6">
                      {user.role === "admin" ? (
                        <span className="text-xs text-gray-400 italic">Protected – cannot change</span>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating === user.id || user.role === "analyst"}
                            onClick={() => updateRole(user.id, "analyst")}
                            className={`h-7 text-xs ${
                              user.role === "analyst"
                                ? "border-blue-300 text-blue-600 bg-blue-50"
                                : ""
                            }`}
                          >
                            Analyst
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updating === user.id || user.role === "viewer"}
                            onClick={() => updateRole(user.id, "viewer")}
                            className={`h-7 text-xs ${
                              user.role === "viewer"
                                ? "border-gray-400 text-gray-600 bg-gray-100"
                                : ""
                            }`}
                          >
                            Viewer
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Role legend */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Role Permissions</h3>
          <div className="grid grid-cols-3 gap-4 text-xs">
            {[
              {
                role: "admin",
                badge: "bg-red-100 text-red-700",
                desc: "Full access. Can manage users, run scans, view all reports, and configure the platform.",
              },
              {
                role: "analyst",
                badge: "bg-blue-100 text-blue-700",
                desc: "Can run scans, view all data, download reports. Cannot manage users or platform settings.",
              },
              {
                role: "viewer",
                badge: "bg-gray-100 text-gray-600",
                desc: "Read-only access. Can view dashboards and reports. Cannot trigger scans.",
              },
            ].map(({ role, badge, desc }) => (
              <div key={role} className="bg-gray-50 rounded-lg p-3">
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${badge}`}>
                  {role}
                </span>
                <p className="text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
