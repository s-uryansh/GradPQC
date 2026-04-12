"use client";

import { Lock } from "lucide-react";

interface Props {
  hidden: number; // how many items are hidden
  label?: string; // e.g. "assets" or "rows"
}

/**
 * Banner shown at the bottom of a restricted table when the viewer role
 * has fewer rows than the full dataset.
 */
export default function ViewerGate({ hidden, label = "items" }: Props) {
  if (hidden <= 0) return null;
  return (
    <tr>
      <td colSpan={99} className="px-4 py-4 text-center bg-gray-50 border-t border-dashed border-gray-200">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Lock className="w-4 h-4 text-amber-500" />
          <span>
            {hidden} more {label} restricted.{" "}
            <span className="text-amber-600 font-medium">Analyst</span> or{" "}
            <span className="text-red-600 font-medium">Admin</span> access required.
          </span>
        </div>
      </td>
    </tr>
  );
}
