"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, EmptyRow, Field, PageHeader, Select, Table, TextInput } from "@/components/admin/ui";
import AppIcon, { APP_ICON_NAMES } from "@/components/portal/AppIcon";

interface RegistryApp {
  id: string;
  key: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  departmentCode: string;
  status: string;
  entraGroupId: string;
  restricted: boolean;
  sortOrder: number;
}

interface Dept {
  code: string;
  name: string;
}

const statusTone = (s: string): "ok" | "info" | "warn" | "neutral" =>
  s === "active" ? "ok" : s === "beta" ? "info" : s === "coming_soon" ? "warn" : "neutral";

export default function AdminAppsPage() {
  const [apps, setApps] = useState<RegistryApp[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RegistryApp | "new" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [appsRes, orgRes] = await Promise.all([fetch("/api/admin/apps"), fetch("/api/admin/organization")]);
      const [appsData, orgData] = await Promise.all([appsRes.json(), orgRes.json()]);
      setApps(appsData.apps ?? []);
      setDepartments(orgData.departments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="App Registry"
        description="The platform catalogue every launcher and access check is driven from. Apps are archived, never deleted."
        actions={<Button onClick={() => setEditing("new")}>Register app</Button>}
      />

      <Table head={["App", "Department", "Status", "Access", "Entra group", "URL", ""]}>
        {loading ? (
          <EmptyRow colSpan={7} message="Loading…" />
        ) : apps.length === 0 ? (
          <EmptyRow colSpan={7} message="No apps registered yet. Register one using the button above." />
        ) : (
          apps.map((app) => (
            <tr key={app.id} className="hover:bg-(--color-surface-0)">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--color-surface-2)">
                    <AppIcon name={app.icon} className="h-4 w-4 text-(--color-ssp-ink-800)" />
                  </div>
                  <div>
                    <p className="font-medium text-(--color-text-strong)">{app.name}</p>
                    <p className="text-xs text-(--color-subtle)">{app.key}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-(--color-muted)">{app.departmentCode || "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone(app.status)}>{app.status.replace("_", " ")}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={app.restricted ? "warn" : "ok"}>{app.restricted ? "restricted" : "open to all"}</Badge>
              </td>
              <td className="max-w-40 truncate px-4 py-3 text-xs text-(--color-muted)" title={app.entraGroupId}>
                {app.entraGroupId || "—"}
              </td>
              <td className="max-w-48 truncate px-4 py-3 text-xs text-(--color-muted)" title={app.url}>
                {app.url || "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="secondary" onClick={() => setEditing(app)}>
                  Edit
                </Button>
              </td>
            </tr>
          ))
        )}
      </Table>

      {editing && (
        <AppEditor
          app={editing === "new" ? null : editing}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function AppEditor({
  app,
  departments,
  onClose,
  onSaved,
}: {
  app: RegistryApp | null;
  departments: Dept[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = app === null;
  const [form, setForm] = useState({
    key: app?.key ?? "",
    name: app?.name ?? "",
    description: app?.description ?? "",
    url: app?.url ?? "",
    icon: app?.icon ?? "AppWindow",
    departmentCode: app?.departmentCode ?? "",
    status: app?.status ?? "active",
    entraGroupId: app?.entraGroupId ?? "",
    restricted: app?.restricted ?? true,
    sortOrder: app?.sortOrder ?? 100,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/apps" : `/api/admin/apps/${app!.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to save");
        return;
      }
      onSaved();
    } catch {
      setError("Failed to save — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="portal-card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-(--color-ssp-ink-900)">{isNew ? "Register application" : `Edit ${app!.name}`}</h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Key" hint={isNew ? "Lowercase, stable, never changes (e.g. ssp-health)" : "Keys are immutable"}>
            <TextInput value={form.key} onChange={(e) => set("key", e.target.value)} disabled={!isNew} placeholder="drivedock" />
          </Field>
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="DriveDock" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <TextInput value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What this app does" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="URL">
              <TextInput value={form.url} onChange={(e) => set("url", e.target.value)} placeholder="https://drivedock.sspgroup.com" />
            </Field>
          </div>
          <Field label="Icon">
            <Select value={form.icon} onChange={(e) => set("icon", e.target.value)}>
              {APP_ICON_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Owning department">
            <Select value={form.departmentCode} onChange={(e) => set("departmentCode", e.target.value)}>
              <option value="">— none —</option>
              {departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="active">active</option>
              <option value="beta">beta</option>
              <option value="coming_soon">coming soon</option>
              <option value="archived">archived</option>
            </Select>
          </Field>
          <Field label="Sort order" hint="Lower numbers appear first">
            <TextInput type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Entra security group Object ID" hint="Members of this Microsoft group get access automatically (e.g. SSP-App-DriveDock)">
              <TextInput
                value={form.entraGroupId}
                onChange={(e) => set("entraGroupId", e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-(--color-text)">
              <input
                type="checkbox"
                className="h-4 w-4 accent-(--color-ssp-ink-900)"
                checked={form.restricted}
                onChange={(e) => set("restricted", e.target.checked)}
              />
              Restricted — users need a grant, Entra group membership, or an admin role to open this app
            </label>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-(--color-brand-600)">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : isNew ? "Register" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
