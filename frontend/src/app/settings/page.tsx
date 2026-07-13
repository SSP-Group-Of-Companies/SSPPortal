"use client";

import Image from "next/image";
import { Monitor, Moon, Sun } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const THEME_OPTIONS: { value: Theme; label: string; description: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", description: "Clean and bright", Icon: Sun },
  { value: "dark", label: "Dark", description: "Easy on the eyes", Icon: Moon },
  { value: "system", label: "System", description: "Follows your OS", Icon: Monitor },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <DashboardShell>
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-8">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--color-surface-2)">
            <Monitor className="h-5 w-5 text-(--color-ssp-cyan-600)" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-(--color-text-strong)">Settings</h1>
            <p className="text-sm text-(--color-muted)">Manage your application preferences</p>
          </div>
        </div>

        <div className="space-y-5">
          {/* About card */}
          <section className="portal-card rounded-2xl p-6">
            <h2 className="mb-4 text-base font-semibold text-(--color-text-strong)">About SSP Portal</h2>
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-(--color-border-soft) bg-(--color-surface-2)">
                <Image src="/images/favicon.png" alt="SSP Portal" width={36} height={36} className="object-contain" />
              </div>
              <div className="space-y-1.5">
                <p className="font-medium text-(--color-text-strong)">SSP Portal</p>
                <p className="text-sm leading-relaxed text-(--color-muted)">
                  The central access gateway for all SSP Group of Companies internal tools. Handles
                  employee identity, app access control, and single sign-on across every SSP
                  platform — built to grow with the SSP software ecosystem.
                </p>
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="rounded-full bg-(--color-surface-2) px-2 py-0.5 text-[11px] font-medium text-(--color-subtle)">
                    Version 0.1.0
                  </span>
                  <span className="rounded-full bg-(--color-surface-2) px-2 py-0.5 text-[11px] font-medium text-(--color-subtle)">
                    Next.js 15 · TypeScript
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-(--color-border-soft) pt-5 text-[13px] text-(--color-subtle)">
              <p>Built and maintained by the SSP Software Team.</p>
              <p className="mt-0.5">© {new Date().getFullYear()} SSP Group of Companies. All rights reserved.</p>
            </div>
          </section>

          {/* Appearance card */}
          <section className="portal-card rounded-2xl p-6">
            <h2 className="mb-1 text-base font-semibold text-(--color-text-strong)">Appearance</h2>
            <p className="mb-5 text-sm text-(--color-muted)">Choose your preferred theme for the application interface.</p>

            <div className="grid grid-cols-3 gap-3">
              {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
                const active = theme === value;
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={cn(
                      "focus-ring flex flex-col items-center gap-2.5 rounded-xl border-2 px-3 py-4 text-center transition",
                      active
                        ? "border-(--color-ssp-cyan-500) bg-(--color-ssp-cyan-500)/8"
                        : "border-(--color-border-soft) bg-(--color-surface-2) hover:border-(--color-border) hover:bg-(--color-surface-2)"
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg transition",
                        active ? "bg-(--color-ssp-cyan-500) text-white" : "bg-(--color-surface-1) text-(--color-subtle)"
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className={cn("text-sm font-medium", active ? "text-(--color-ssp-cyan-600)" : "text-(--color-text-strong)")}>{label}</p>
                      <p className="text-[11px] text-(--color-subtle)">{description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </DashboardShell>
  );
}
