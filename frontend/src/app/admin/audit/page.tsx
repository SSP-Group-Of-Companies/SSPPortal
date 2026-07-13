"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, EmptyRow, PageHeader, Pagination, Select, Table } from "@/components/admin/ui";

interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string;
  targetType: string;
  targetLabel: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

const ACTION_FILTERS = [
  "",
  "user.provisioned",
  "user.imported",
  "user.signed_in",
  "user.role_changed",
  "user.status_changed",
  "user.apps_changed",
  "app.created",
  "app.updated",
  "access_request.created",
  "access_request.approved",
  "access_request.denied",
  "platform.seeded",
];

const actionTone = (action: string): "danger" | "ok" | "neutral" | "info" => {
  if (action.includes("denied") || action.includes("disabled")) return "danger";
  if (action.includes("approved") || action.includes("created") || action.includes("provisioned") || action.includes("imported")) return "ok";
  if (action.includes("signed_in")) return "neutral";
  return "info";
};

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?action=${encodeURIComponent(action)}&page=${page}`);
      const data = await res.json();
      setEntries(data.entries ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [action, page]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Audit Log" description="Immutable record of every governance action on the platform." />

      <div className="mb-4 max-w-xs">
        <Select
          value={action}
          onChange={(e) => {
            setPage(1);
            setAction(e.target.value);
          }}
        >
          {ACTION_FILTERS.map((a) => (
            <option key={a} value={a}>
              {a === "" ? "All actions" : a}
            </option>
          ))}
        </Select>
      </div>

      <Table head={["When", "Action", "Actor", "Target", "Details"]}>
        {loading ? (
          <EmptyRow colSpan={5} message="Loading…" />
        ) : entries.length === 0 ? (
          <EmptyRow colSpan={5} message="No audit entries match this filter." />
        ) : (
          entries.map((e) => (
            <tr key={e.id} className="hover:bg-(--color-surface-0)">
              <td className="whitespace-nowrap px-4 py-3 text-(--color-muted)">{new Date(e.createdAt).toLocaleString()}</td>
              <td className="px-4 py-3">
                <Badge tone={actionTone(e.action)}>{e.action}</Badge>
              </td>
              <td className="px-4 py-3 text-(--color-muted)">{e.actorEmail}</td>
              <td className="px-4 py-3 text-(--color-muted)">{e.targetLabel || "—"}</td>
              <td className="max-w-72 truncate px-4 py-3 font-mono text-[11px] text-(--color-subtle)" title={JSON.stringify(e.meta)}>
                {Object.keys(e.meta ?? {}).length > 0 ? JSON.stringify(e.meta) : "—"}
              </td>
            </tr>
          ))
        )}
      </Table>

      <Pagination page={page} pageSize={50} total={total} onPage={setPage} />
    </div>
  );
}
