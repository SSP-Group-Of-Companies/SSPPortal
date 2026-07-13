"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, EmptyRow, PageHeader, Table } from "@/components/admin/ui";
import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";

interface Request {
  id: string;
  userEmail: string;
  userName: string;
  appKey: string;
  message: string;
  status: string;
  decidedByEmail: string;
  decidedAt: string | null;
  decisionNote: string;
  createdAt: string;
}

const FILTERS = ["pending", "approved", "denied"] as const;

export default function AdminAccessRequestsPage() {
  const { toasts, toast, dismiss } = useToast();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("pending");
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/access-requests?status=${filter}`);
      const data = await res.json();
      setRequests(data.requests ?? []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "approved" | "denied") {
    const req = requests.find((r) => r.id === id);
    setDeciding(id);
    try {
      const res = await fetch(`/api/admin/access-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        if (decision === "approved") {
          toast("success", "Access granted", `${req?.userName || req?.userEmail} now has access to ${req?.appKey}.`);
        } else {
          toast("success", "Request denied", `${req?.userName || req?.userEmail}'s request for ${req?.appKey} was denied.`);
        }
      } else {
        toast("error", "Action failed", "The request could not be processed. Please try again.");
      }
      void load();
    } catch {
      toast("error", "Action failed", "Could not connect. Please check your connection and try again.");
    } finally {
      setDeciding(null);
    }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        title="Access Requests"
        description="Employee requests for restricted applications. Approving writes the app grant onto the user immediately."
      />

      <div className="mb-4 flex gap-1 rounded-lg bg-(--color-surface-2) p-1" style={{ width: "fit-content" }}>
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "focus-ring rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition",
              filter === f ? "bg-(--color-surface-1) text-(--color-text-strong) shadow-sm" : "text-(--color-muted)"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <Table head={["Requested by", "App", "Message", "Requested", filter === "pending" ? "Actions" : "Decision"]}>
        {loading ? (
          <EmptyRow colSpan={5} message="Loading…" />
        ) : requests.length === 0 ? (
          <EmptyRow colSpan={5} message={`No ${filter} requests.`} />
        ) : (
          requests.map((r) => (
            <tr key={r.id} className="hover:bg-(--color-surface-0)">
              <td className="px-4 py-3">
                <p className="font-medium text-(--color-text-strong)">{r.userName || "—"}</p>
                <p className="text-xs text-(--color-subtle)">{r.userEmail}</p>
              </td>
              <td className="px-4 py-3">
                <Badge tone="info">{r.appKey}</Badge>
              </td>
              <td className="max-w-60 px-4 py-3 text-(--color-muted)">{r.message || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-(--color-muted)">{new Date(r.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-3">
                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <Button onClick={() => decide(r.id, "approved")} disabled={deciding === r.id}>
                      Approve
                    </Button>
                    <Button variant="secondary" onClick={() => decide(r.id, "denied")} disabled={deciding === r.id}>
                      Deny
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Badge tone={r.status === "approved" ? "ok" : "danger"}>{r.status}</Badge>
                    <p className="mt-1 text-xs text-(--color-subtle)">
                      by {r.decidedByEmail} {r.decidedAt ? `· ${new Date(r.decidedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                )}
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}
