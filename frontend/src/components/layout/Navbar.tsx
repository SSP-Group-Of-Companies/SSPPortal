"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react"; // keep in Portal only
import { ChevronDown, LogOut, Menu, ShieldCheck } from "lucide-react";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { NEXT_PUBLIC_ORIGIN } from "@/app/config/env";
import { usePortalData } from "@/components/portal/PortalDataProvider";

interface NavbarProps {
  onToggleSidebar: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  member: "Employee",
  admin: "Portal Admin",
  superadmin: "Superadmin",
};

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { data: session } = useSession();
  const { user } = usePortalData();
  const userName = session?.user?.name || "User";
  const role = user?.role ?? "member";
  const isAdmin = role === "admin" || role === "superadmin";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Build logout URL -> /api/auth/logout (Portal route)
  const portalBase = NEXT_PUBLIC_ORIGIN || "";
  const logoutHref = portalBase ? new URL("/api/auth/logout", portalBase).toString() : "/api/auth/logout";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-(--color-border-soft) bg-(--color-surface-1)/90 px-4 backdrop-blur md:px-6">
      {/* Mobile: open sidebar */}
      <button
        onClick={onToggleSidebar}
        title="Open menu"
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-(--color-muted) transition hover:bg-(--color-surface-2) lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden lg:block" />

      {/* Right: theme toggle + user dropdown */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

      <div className="relative flex items-center gap-2" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((prev) => !prev)}
          className="focus-ring flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 transition hover:bg-(--color-surface-2)"
        >
          <ProfileAvatar size={32} />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium leading-tight text-(--color-text-strong)">{userName}</span>
            <span className="block text-[11px] leading-tight text-(--color-subtle)">{ROLE_LABELS[role] ?? role}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-(--color-subtle)" />
        </button>

        {dropdownOpen && (
          <div
            className="portal-card absolute right-0 top-12 z-50 mt-1 w-52 overflow-hidden rounded-xl py-1.5"
            role="menu"
          >
            <div className="border-b border-(--color-border-soft) px-4 py-2.5">
              <p className="truncate text-sm font-medium text-(--color-text-strong)">{userName}</p>
              <p className="truncate text-xs text-(--color-subtle)">{session?.user?.email}</p>
            </div>
            {isAdmin && (
              <Link
                href="/admin"
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-(--color-text) transition hover:bg-(--color-surface-2)"
              >
                <ShieldCheck className="h-4 w-4 text-(--color-ssp-cyan-600)" />
                Admin Console
              </Link>
            )}
            <a
              href={logoutHref}
              role="menuitem"
              onClick={() => setDropdownOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-(--color-brand-600) transition hover:bg-(--color-brand-50)"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </a>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}
