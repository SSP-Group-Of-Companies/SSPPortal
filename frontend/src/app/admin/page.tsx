"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, AppWindow, Inbox, Database } from "lucide-react";
import { Button } from "@/components/admin/ui";
import { usePortalData } from "@/components/portal/PortalDataProvider";

interface Overview {
  users: number;
  apps: number;
  pendingRequests: number;
}

/** Overview: live platform counts plus the one-time seed action. */
export default function AdminOverviewPage() {
  const { user } = usePortalData();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  async function load() {
    try {
      const [usersRes, appsRes, requestsRes] = await Promise.all([
        fetch("/api/admin/users?page=1"),
        fetch("/api/admin/apps"),
        fetch("/api/admin/access-requests?status=pending"),
      ]);
      const [users, apps, requests] = await Promise.all([usersRes.json(), appsRes.json(), requestsRes.json()]);
      setOverview({
        users: users.total ?? 0,
        apps: (apps.apps ?? []).length,
        pendingRequests: (requests.requests ?? []).length,
      });
    } catch {
      setOverview(null);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runSeed() {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch("/api/admin/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setSeedResult(data.error ?? "Seed failed");
      } else {
        setSeedResult(
          `Seed complete — created ${data.created.companies} companies, ${data.created.departments} departments, ${data.created.apps} apps (existing records untouched).`
        );
        void load();
      }
    } catch {
      setSeedResult("Seed failed — check the server logs.");
    } finally {
      setSeeding(false);
    }
  }

  const cards = [
    { label: "Directory users", value: overview?.users, icon: Users, href: "/admin/users" },
    { label: "Registered apps", value: overview?.apps, icon: AppWindow, href: "/admin/apps" },
    { label: "Pending access requests", value: overview?.pendingRequests, icon: Inbox, href: "/admin/access-requests" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="portal-card focus-ring rounded-2xl p-5 transition hover:shadow-(--shadow-card-hover)">
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--color-muted)">{card.label}</span>
              <card.icon className="h-4 w-4 text-(--color-ssp-cyan-600)" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-(--color-ssp-ink-900)">{card.value ?? "—"}</p>
          </Link>
        ))}
      </div>

      {user?.role === "superadmin" && (
        <div className="portal-card rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-(--color-surface-2)">
              <Database className="h-5 w-5 text-(--color-ssp-ink-800)" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-(--color-text-strong)">Platform seed</h2>
              <p className="mt-1 text-sm leading-relaxed text-(--color-muted)">
                Creates the SSP operating companies, group departments, and the initial app registry (DriveDock, SSP Health).
                Idempotent — running it again never overwrites records that already exist.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={runSeed} disabled={seeding}>
                  {seeding ? "Seeding…" : "Run seed"}
                </Button>
                {seedResult && <p className="text-sm text-(--color-muted)">{seedResult}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
