"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { usePortalData, type PortalApp } from "@/components/portal/PortalDataProvider";
import AppIcon from "@/components/portal/AppIcon";
import { ArrowUpRight, Clock, Lock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { NEXT_PUBLIC_ORIGIN } from "@/app/config/env";

export default function DashboardPage() {
  return (
    <DashboardShell>
      <Suspense fallback={null}>
        <Launcher />
      </Suspense>
    </DashboardShell>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Launcher() {
  const { apps, user, loading, error, needsReauth, pendingRequests, refresh } = usePortalData();
  const firstName = (user?.name ?? "").split(" ")[0] || "there";
  const logoutHref = NEXT_PUBLIC_ORIGIN ? new URL("/api/auth/logout", NEXT_PUBLIC_ORIGIN).toString() : "/api/auth/logout";

  // Subapps redirect here with ?denied=<appKey> when the portal has not
  // granted the user access to that application.
  const deniedKey = useSearchParams().get("denied");
  const deniedApp = deniedKey ? apps.find((a) => a.key === deniedKey) : undefined;

  const accessible = apps.filter((a) => a.hasAccess && a.status !== "coming_soon");
  const locked = apps.filter((a) => !a.hasAccess && a.status !== "coming_soon");
  const comingSoon = apps.filter((a) => a.status === "coming_soon");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-(--color-ssp-ink-900) md:text-3xl">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-(--color-muted)">
          Your central access point to SSP internal systems.
        </p>
      </div>

      {deniedKey && !loading && (
        <div className="portal-card mb-6 flex items-start gap-3 rounded-xl border-l-4 border-l-(--color-warn-500) px-5 py-4">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-(--color-warn-500)" />
          <p className="text-sm leading-relaxed text-(--color-text)">
            You don&apos;t have access to <strong>{deniedApp?.name ?? deniedKey}</strong> yet.
            {deniedApp && !deniedApp.hasAccess
              ? " Use the Request access button on its card below, or contact your department head."
              : " If you were just granted access, wait a few minutes and try again."}
          </p>
        </div>
      )}

      {error && needsReauth && (
        <div className="portal-card mb-6 rounded-xl border-l-4 border-l-(--color-brand-600) px-5 py-4 text-sm text-(--color-text)">
          {error} Please{" "}
          <a href={logoutHref} className="font-medium text-(--color-ssp-cyan-600) underline">
            sign out and sign in again
          </a>{" "}
          to continue.
        </div>
      )}

      {error && !needsReauth && (
        <div className="portal-card mb-6 rounded-xl border-l-4 border-l-(--color-brand-600) px-5 py-4 text-sm text-(--color-text)">
          {error} —{" "}
          <button onClick={() => refresh()} className="font-medium text-(--color-ssp-cyan-600) underline">
            retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-(--color-surface-2)" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <section>
            <SectionHeading title="Your applications" count={accessible.length} />
            {accessible.length === 0 ? (
              <p className="portal-card rounded-xl px-5 py-6 text-sm text-(--color-muted)">
                No applications assigned yet. Request access below, or contact your department head.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {accessible.map((app) => (
                  <AppCard key={app.key} app={app} pending={false} />
                ))}
              </div>
            )}
          </section>

          {locked.length > 0 && (
            <section>
              <SectionHeading title="Available on request" count={locked.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {locked.map((app) => (
                  <AppCard key={app.key} app={app} pending={pendingRequests.includes(app.key)} />
                ))}
              </div>
            </section>
          )}

          {comingSoon.length > 0 && (
            <section>
              <SectionHeading title="Coming soon" count={comingSoon.length} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {comingSoon.map((app) => (
                  <AppCard key={app.key} app={app} pending={false} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-(--color-subtle)">{title}</h2>
      <span className="rounded-full bg-(--color-surface-2) px-2 py-0.5 text-xs font-medium text-(--color-muted)">{count}</span>
    </div>
  );
}

function AppCard({ app, pending }: { app: PortalApp; pending: boolean }) {
  const { refresh } = usePortalData();
  const [requesting, setRequesting] = useState(false);
  const [requestState, setRequestState] = useState<"idle" | "sent" | "error">(pending ? "sent" : "idle");

  const openable = app.hasAccess && app.status !== "coming_soon" && app.url;

  async function requestAccess() {
    setRequesting(true);
    try {
      const res = await fetch("/api/portal/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey: app.key }),
      });
      if (res.ok || res.status === 409) {
        setRequestState("sent");
        void refresh();
      } else {
        setRequestState("error");
      }
    } catch {
      setRequestState("error");
    } finally {
      setRequesting(false);
    }
  }

  const cardInner = (
    <>
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl",
            openable ? "bg-(--color-ssp-ink-900)/5 text-(--color-ssp-ink-800)" : "bg-(--color-surface-2) text-(--color-subtle)"
          )}
        >
          <AppIcon name={app.icon} className="h-5 w-5" />
        </div>
        {openable && (
          <ArrowUpRight className="h-4 w-4 text-(--color-subtle) transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-(--color-ssp-cyan-600)" />
        )}
        {app.status === "coming_soon" && (
          <span className="flex items-center gap-1 rounded-full bg-(--color-surface-2) px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-(--color-subtle)">
            <Clock className="h-3 w-3" /> Soon
          </span>
        )}
        {!app.hasAccess && app.status !== "coming_soon" && (
          <span className="flex items-center gap-1 rounded-full bg-(--color-surface-2) px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-(--color-subtle)">
            <Lock className="h-3 w-3" /> Restricted
          </span>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-base font-semibold text-(--color-text-strong)">{app.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-relaxed text-(--color-muted)">
          {app.description || "Internal SSP application."}
        </p>
      </div>
    </>
  );

  if (openable) {
    return (
      <a
        href={app.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group portal-card focus-ring flex flex-col rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-(--shadow-card-hover)"
      >
        {cardInner}
      </a>
    );
  }

  return (
    <div className="portal-card flex flex-col rounded-2xl p-5 opacity-90">
      {cardInner}
      {!app.hasAccess && app.status !== "coming_soon" && (
        <div className="mt-3">
          {requestState === "sent" ? (
            <p className="text-xs font-medium text-(--color-ok-500)">Access request sent — an admin will review it.</p>
          ) : (
            <button
              onClick={requestAccess}
              disabled={requesting}
              className="focus-ring rounded-lg bg-(--color-ssp-ink-900) px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-(--color-ssp-ink-800) disabled:opacity-60"
            >
              {requesting ? "Sending…" : "Request access"}
            </button>
          )}
          {requestState === "error" && <p className="mt-1.5 text-xs text-(--color-brand-600)">Could not send request. Try again.</p>}
        </div>
      )}
    </div>
  );
}
