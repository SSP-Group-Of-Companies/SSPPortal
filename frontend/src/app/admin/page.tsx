"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, AppWindow, Inbox } from "lucide-react";

interface Overview {
  users: number;
  apps: number;
  pendingRequests: number;
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, appsRes, requestsRes] = await Promise.all([
          fetch("/api/admin/users?page=1"),
          fetch("/api/admin/apps"),
          fetch("/api/admin/access-requests?status=pending"),
        ]);
        const [users, apps, requests] = await Promise.all([
          usersRes.json(),
          appsRes.json(),
          requestsRes.json(),
        ]);
        setOverview({
          users: users.total ?? 0,
          apps: (apps.apps ?? []).length,
          pendingRequests: (requests.requests ?? []).length,
        });
      } catch {
        setOverview(null);
      }
    }
    void load();
  }, []);

  const cards = [
    { label: "Directory users", value: overview?.users, icon: Users, href: "/admin/users" },
    { label: "Registered apps", value: overview?.apps, icon: AppWindow, href: "/admin/apps" },
    { label: "Pending access requests", value: overview?.pendingRequests, icon: Inbox, href: "/admin/access-requests" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="portal-card focus-ring rounded-2xl p-5 transition hover:shadow-(--shadow-card-hover)"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-(--color-muted)">{card.label}</span>
              <card.icon className="h-4 w-4 text-(--color-ssp-cyan-600)" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-(--color-ssp-ink-900)">
              {card.value ?? "—"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
