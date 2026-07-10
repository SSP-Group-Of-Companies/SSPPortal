"use client";

import { cn } from "@/lib/utils";
import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes } from "react";

/* Small shared primitives for the admin console. */

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "ok" | "warn" | "danger" | "info"; children: ReactNode }) {
  const tones: Record<string, string> = {
    neutral: "bg-(--color-surface-2) text-(--color-muted)",
    ok: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    danger: "bg-(--color-brand-50) text-(--color-brand-700)",
    info: "bg-sky-50 text-sky-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants: Record<string, string> = {
    primary: "bg-(--color-ssp-ink-900) text-white hover:bg-(--color-ssp-ink-800)",
    secondary: "border border-(--color-border) bg-(--color-surface-1) text-(--color-text) hover:bg-(--color-surface-2)",
    danger: "bg-(--color-brand-600) text-white hover:bg-(--color-brand-700)",
    ghost: "text-(--color-muted) hover:bg-(--color-surface-2)",
  };
  return (
    <button
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-(--color-muted)">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-(--color-subtle)">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring w-full rounded-lg border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm text-(--color-text) placeholder:text-(--color-subtle)",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "focus-ring w-full rounded-lg border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-sm text-(--color-text)",
        className
      )}
      {...props}
    />
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="portal-card overflow-x-auto rounded-xl">
      <table className="w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border-soft)">
            {head.map((h, i) => (
              <th key={`${h}-${i}`} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--color-subtle)">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--color-border-soft)">{children}</tbody>
      </table>
    </div>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-(--color-subtle)">
        {message}
      </td>
    </tr>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-(--color-ssp-ink-900)">{title}</h1>
        {description && <p className="mt-1 text-sm text-(--color-muted)">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Pagination({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-(--color-muted)">
      <span>
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
