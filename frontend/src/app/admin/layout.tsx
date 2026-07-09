"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/apps", label: "App Registry" },
  { href: "/admin/access-requests", label: "Access Requests" },
  { href: "/admin/organization", label: "Organization" },
  { href: "/admin/audit", label: "Audit Log" },
];

/**
 * Admin console shell. Middleware already gates /admin to admin/superadmin;
 * every API called from these pages re-checks the role server-side.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-(--color-ssp-cyan-600)">Platform Governance</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-(--color-ssp-ink-900)">Admin Console</h1>
        </div>

        <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-(--color-border-soft)">
          {TABS.map((tab) => {
            const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "focus-ring -mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition",
                  active
                    ? "border-(--color-ssp-cyan-500) text-(--color-ssp-ink-900)"
                    : "border-transparent text-(--color-muted) hover:text-(--color-text-strong)"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </DashboardShell>
  );
}
