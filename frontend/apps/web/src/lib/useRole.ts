"use client";

import { useState, useEffect } from "react";

export function useRole() {
  const [role, setRole] = useState<string>("viewer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        setRole(d.role ?? "viewer");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { role, loading };
}
