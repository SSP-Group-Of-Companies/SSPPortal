"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, EmptyRow, Field, PageHeader, Select, Table, TextInput } from "@/components/admin/ui";
import { usePortalData } from "@/components/portal/PortalDataProvider";

interface Company {
  id: string;
  code: string;
  name: string;
  legalName: string;
  country: string;
  isActive: boolean;
}

interface Department {
  id: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
}

export default function AdminOrganizationPage() {
  const { user } = usePortalData();
  const isSuperadmin = user?.role === "superadmin";
  const [companies, setCompanies] = useState<Company[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<"company" | "department" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/organization");
      const data = await res.json();
      setCompanies(data.companies ?? []);
      setDepartments(data.departments ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-10">
      <section>
        <PageHeader
          title="Operating Companies"
          description="The top of the platform hierarchy. Referenced by code across every SSP application."
          actions={
            isSuperadmin && (
              <Button onClick={() => setCreating("company")}>Add company</Button>
            )
          }
        />
        <Table head={["Company", "Code", "Country", "Status"]}>
          {loading ? (
            <EmptyRow colSpan={4} message="Loading…" />
          ) : companies.length === 0 ? (
            <EmptyRow colSpan={4} message="No companies registered yet. Add one using the button above." />
          ) : (
            companies.map((c) => (
              <tr key={c.id} className="hover:bg-(--color-surface-0)">
                <td className="px-4 py-3">
                  <p className="font-medium text-(--color-text-strong)">{c.name}</p>
                  {c.legalName && <p className="text-xs text-(--color-subtle)">{c.legalName}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-(--color-muted)">{c.code}</td>
                <td className="px-4 py-3 text-(--color-muted)">{c.country}</td>
                <td className="px-4 py-3">
                  <Badge tone={c.isActive ? "ok" : "neutral"}>{c.isActive ? "active" : "inactive"}</Badge>
                </td>
              </tr>
            ))
          )}
        </Table>
      </section>

      <section>
        <PageHeader
          title="Departments"
          description="Group-level departments. App registry entries and users reference these by code."
          actions={<Button onClick={() => setCreating("department")}>Add department</Button>}
        />
        <Table head={["Department", "Code", "Description", "Status"]}>
          {loading ? (
            <EmptyRow colSpan={4} message="Loading…" />
          ) : departments.length === 0 ? (
            <EmptyRow colSpan={4} message="No departments registered yet. Add one using the button above." />
          ) : (
            departments.map((d) => (
              <tr key={d.id} className="hover:bg-(--color-surface-0)">
                <td className="px-4 py-3 font-medium text-(--color-text-strong)">{d.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-(--color-muted)">{d.code}</td>
                <td className="px-4 py-3 text-(--color-muted)">{d.description || "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={d.isActive ? "ok" : "neutral"}>{d.isActive ? "active" : "inactive"}</Badge>
                </td>
              </tr>
            ))
          )}
        </Table>
      </section>

      {creating && (
        <CreateOrgEntity
          type={creating}
          onClose={() => setCreating(null)}
          onSaved={() => {
            setCreating(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function CreateOrgEntity({ type, onClose, onSaved }: { type: "company" | "department"; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ code: "", name: "", legalName: "", country: "CA", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create");
        return;
      }
      onSaved();
    } catch {
      setError("Failed to create — check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="portal-card w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold capitalize text-(--color-ssp-ink-900)">Add {type}</h2>

        <div className="mt-6 space-y-4">
          <Field label="Code" hint="Lowercase, stable, never changes (e.g. ssp-truckline)">
            <TextInput value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="ssp-truckline" />
          </Field>
          <Field label="Name">
            <TextInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          {type === "company" ? (
            <>
              <Field label="Legal name (optional)">
                <TextInput value={form.legalName} onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))} />
              </Field>
              <Field label="Country">
                <Select value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}>
                  <option value="CA">Canada</option>
                  <option value="US">United States</option>
                </Select>
              </Field>
            </>
          ) : (
            <Field label="Description (optional)">
              <TextInput value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </Field>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-(--color-brand-600)">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}
