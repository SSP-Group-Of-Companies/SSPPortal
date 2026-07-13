"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, Lock, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePortalData } from "@/components/portal/PortalDataProvider";
import AppIcon from "@/components/portal/AppIcon";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isDesktop: boolean;
}

const isAdminRole = (role?: string) => role === "admin" || role === "superadmin";

/**
 * Navigation is driven entirely by the App Registry: apps are grouped by
 * their owning department, and only what exists in the database is shown.
 */
export default function Sidebar({ isOpen, onClose, isDesktop }: SidebarProps) {
  const pathname = usePathname();
  const { apps, departments, user, loading } = usePortalData();

  const visibleApps = apps.filter((a) => a.status !== "archived");
  const deptName = (code: string) => departments.find((d) => d.code === code)?.name ?? (code ? code.toUpperCase() : "Other");

  const grouped = new Map<string, typeof visibleApps>();
  for (const app of visibleApps) {
    const key = app.departmentCode || "other";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(app);
  }

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-68 flex-col bg-(--color-sidebar-bg) text-white transition-transform duration-300 ease-in-out",
        "border-r border-white/8",
        isOpen ? "translate-x-0" : "-translate-x-full",
        isDesktop && "lg:translate-x-0"
      )}
    >
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between border-b border-white/8 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/images/favicon.png" alt="SSP" width={28} height={28} className="h-7 w-7 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide">SSP Portal</p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">Group of Companies</p>
          </div>
        </Link>
        {!isDesktop && (
          <button
            onClick={onClose}
            title="Close sidebar"
            className="focus-ring flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {/* Dashboard */}
        <div>
          <Link
            href="/dashboard"
            onClick={() => !isDesktop && onClose()}
            className={cn(
              "focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              pathname === "/dashboard"
                ? "bg-(--color-sidebar-active) font-medium text-white"
                : "text-white/75 hover:bg-(--color-sidebar-hover) hover:text-white"
            )}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </Link>
        </div>

        {/* App registry, grouped by owning department */}
        {loading ? (
          <div className="space-y-2 px-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
        ) : (
          [...grouped.entries()].map(([deptCode, deptApps]) => (
            <div key={deptCode}>
              <h3 className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                {deptName(deptCode)}
              </h3>
              <ul className="space-y-0.5">
                {deptApps.map((app) => {
                  const openable = app.hasAccess && app.status !== "coming_soon" && app.url;
                  return (
                    <li key={app.key}>
                      {openable ? (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/75 transition hover:bg-(--color-sidebar-hover) hover:text-white"
                        >
                          <AppIcon name={app.icon} className="h-4 w-4 shrink-0 text-(--color-ssp-cyan-500)" />
                          <span className="truncate">{app.name}</span>
                        </a>
                      ) : (
                        <div className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/35">
                          <AppIcon name={app.icon} className="h-4 w-4 shrink-0" />
                          <span className="truncate">{app.name}</span>
                          {app.status === "coming_soon" ? (
                            <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide">Soon</span>
                          ) : (
                            !app.hasAccess && <Lock className="ml-auto h-3 w-3 shrink-0" />
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}

        {/* Admin console */}
        {isAdminRole(user?.role) && (
          <div className="border-t border-white/8 pt-4">
            <h3 className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/40">Platform</h3>
            <Link
              href="/admin"
              onClick={() => !isDesktop && onClose()}
              className={cn(
                "focus-ring flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                pathname.startsWith("/admin")
                  ? "bg-(--color-sidebar-active) font-medium text-white"
                  : "text-white/75 hover:bg-(--color-sidebar-hover) hover:text-white"
              )}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-(--color-ssp-cyan-500)" />
              Admin Console
            </Link>
          </div>
        )}
      </nav>

      {/* Bottom: Settings + copyright */}
      <div className="border-t border-white/8 px-3 py-3">
        <Link
          href="/settings"
          onClick={() => !isDesktop && onClose()}
          className={cn(
            "focus-ring mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
            pathname === "/settings"
              ? "bg-(--color-sidebar-active) font-medium text-white"
              : "text-white/60 hover:bg-(--color-sidebar-hover) hover:text-white/90"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
        <p className="px-3 text-[10px] text-white/30">© {new Date().getFullYear()} SSP Group of Companies</p>
      </div>
    </aside>
  );
}
