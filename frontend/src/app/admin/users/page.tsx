"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, EmptyRow, Field, PageHeader, Pagination, Select, Table, TextInput } from "@/components/admin/ui";
import { usePortalData } from "@/components/portal/PortalDataProvider";

interface DirectoryUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  companyCode: string;
  departmentCode: string;
  appKeys: string[];
  lastLoginAt: string | null;
}

interface RegistryApp {
  key: string;
  name: string;
  restricted: boolean;
  status: string;
}

interface OrgData {
  companies: { code: string; name: string }[];
  departments: { code: string; name: string }[];
}

const roleTone = (role: string): "danger" | "info" | "neutral" =>
  role === "superadmin" ? "danger" : role === "admin" ? "info" : "neutral";

export default function AdminUsersPage() {
  const { user: me } = usePortalData();
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DirectoryUser | null>(null);
  const [apps, setApps] = useState<RegistryApp[]>([]);
  const [org, setOrg] = useState<OrgData>({ companies: [], departments: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?q=${encodeURIComponent(search)}&page=${page}`);
      const data = await res.json();
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const [appsRes, orgRes] = await Promise.all([fetch("/api/admin/apps"), fetch("/api/admin/organization")]);
      const [appsData, orgData] = await Promise.all([appsRes.json(), orgRes.json()]);
      setApps(appsData.apps ?? []);
      setOrg({ companies: orgData.companies ?? [], departments: orgData.departments ?? [] });
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="User Directory"
        description="Every SSP employee who has signed in. Manage roles, status, organization, and app access."
      />

      <form
        className="mb-4 flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(query);
        }}
      >
        <TextInput placeholder="Search by name or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <Table head={["User", "Role", "Status", "Company", "Department", "App grants", "Last login", ""]}>
        {loading ? (
          <EmptyRow colSpan={8} message="Loading…" />
        ) : users.length === 0 ? (
          <EmptyRow colSpan={8} message="No users found." />
        ) : (
          users.map((u) => (
            <tr key={u.id} className="hover:bg-(--color-surface-0)">
              <td className="px-4 py-3">
                <p className="font-medium text-(--color-text-strong)">{u.name || "—"}</p>
                <p className="text-xs text-(--color-subtle)">{u.email}</p>
              </td>
              <td className="px-4 py-3">
                <Badge tone={roleTone(u.role)}>{u.role}</Badge>
              </td>
              <td className="px-4 py-3">
                <Badge tone={u.status === "active" ? "ok" : "danger"}>{u.status}</Badge>
              </td>
              <td className="px-4 py-3 text-(--color-muted)">{u.companyCode || "—"}</td>
              <td className="px-4 py-3 text-(--color-muted)">{u.departmentCode || "—"}</td>
              <td className="px-4 py-3 text-(--color-muted)">{u.appKeys.length > 0 ? u.appKeys.join(", ") : "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-(--color-muted)">
                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <Button variant="secondary" onClick={() => setEditing(u)}>
                  Manage
                </Button>
              </td>
            </tr>
          ))
        )}
      </Table>

      <Pagination page={page} pageSize={25} total={total} onPage={setPage} />

      {editing && (
        <EditUserPanel
          user={editing}
          apps={apps}
          org={org}
          isSuperadmin={me?.role === "superadmin"}
          isSelf={me?.email === editing.email}
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

function EditUserPanel({
  user,
  apps,
  org,
  isSuperadmin,
  isSelf,
  onClose,
  onSaved,
}: {
  user: DirectoryUser;
  apps: RegistryApp[];
  org: OrgData;
  isSuperadmin: boolean;
  isSelf: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [companyCode, setCompanyCode] = useState(user.companyCode);
  const [departmentCode, setDepartmentCode] = useState(user.departmentCode);
  const [appKeys, setAppKeys] = useState<string[]>(user.appKeys);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantable = apps.filter((a) => a.restricted && a.status !== "archived");

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, status, companyCode, departmentCode, appKeys }),
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
      <div className="portal-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-(--color-ssp-ink-900)">Manage user</h2>
        <p className="mt-0.5 text-sm text-(--color-muted)">
          {user.name} · {user.email}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Role" hint={!isSuperadmin ? "Only superadmins can change roles" : isSelf ? "You cannot change your own role" : undefined}>
            <Select value={role} onChange={(e) => setRole(e.target.value)} disabled={!isSuperadmin || isSelf}>
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </Select>
          </Field>

          <Field label="Status" hint={isSelf ? "You cannot disable your own account" : undefined}>
            <Select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSelf}>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </Select>
          </Field>

          <Field label="Company">
            <Select value={companyCode} onChange={(e) => setCompanyCode(e.target.value)}>
              <option value="">— none —</option>
              {org.companies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Department">
            <Select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)}>
              <option value="">— none —</option>
              {org.departments.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-xs font-medium text-(--color-muted)">Direct app grants</p>
          {grantable.length === 0 ? (
            <p className="text-sm text-(--color-subtle)">No restricted apps registered yet.</p>
          ) : (
            <div className="space-y-2">
              {grantable.map((app) => (
                <label key={app.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-(--color-text)">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-(--color-ssp-ink-900)"
                    checked={appKeys.includes(app.key)}
                    onChange={(e) =>
                      setAppKeys((prev) => (e.target.checked ? [...prev, app.key] : prev.filter((k) => k !== app.key)))
                    }
                  />
                  {app.name} <span className="text-xs text-(--color-subtle)">({app.key})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-(--color-brand-600)">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
