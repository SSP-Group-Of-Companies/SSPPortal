"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Search, X, CheckSquare, Square } from "lucide-react";
import { Badge, Button, Field, Select } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

interface GraphResult {
  azureId: string;
  email: string;
  name: string;
  jobTitle: string;
  department: string;
  accountEnabled: boolean;
  alreadyImported: boolean;
  role: string | null;
  appKeys: string[];
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

interface Props {
  onClose: () => void;
  onSuccess: (title: string, description: string) => void;
  onImported: () => void;
}

export default function ImportFromEntraModal({ onClose, onSuccess, onImported }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GraphResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [apps, setApps] = useState<RegistryApp[]>([]);
  const [org, setOrg] = useState<OrgData>({ companies: [], departments: [] });
  const [grantAppKeys, setGrantAppKeys] = useState<string[]>([]);
  const [companyCode, setCompanyCode] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");

  const [importing, setImporting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    void (async () => {
      const [appsRes, orgRes] = await Promise.all([fetch("/api/admin/apps"), fetch("/api/admin/organization")]);
      const [appsData, orgData] = await Promise.all([appsRes.json(), orgRes.json()]);
      setApps(appsData.apps ?? []);
      setOrg({ companies: orgData.companies ?? [], departments: orgData.departments ?? [] });
    })();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/admin/directory/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) {
        setSearchError(data.error ?? "Search failed");
        setResults([]);
        return;
      }
      setResults(data.users ?? []);
      setSelected(new Set());
    } catch {
      setSearchError("Could not reach the directory. Check your connection.");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced auto-search: fires 350ms after the user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  function toggle(azureId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(azureId)) {
        next.delete(azureId);
      } else {
        next.add(azureId);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.azureId)));
    }
  }

  async function runImport() {
    const chosen = results.filter((r) => selected.has(r.azureId));
    if (!chosen.length) return;
    setImporting(true);
    try {
      const res = await fetch("/api/admin/directory/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: chosen.map((u) => ({ azureId: u.azureId, email: u.email, name: u.name })),
          appKeys: grantAppKeys,
          companyCode,
          departmentCode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onSuccess("error", data.error ?? "Import failed");
        return;
      }

      const parts: string[] = [];
      if (data.created) parts.push(`${data.created} employee${data.created !== 1 ? "s" : ""} added to the portal`);
      if (data.updated) parts.push(`${data.updated} updated with new grants`);
      if (data.skipped) parts.push(`${data.skipped} already up to date`);

      onSuccess(
        "Import complete",
        parts.length ? parts.join(", ") : "No changes were needed."
      );
      setSelected(new Set());
      onImported();
      void runSearch(query);
    } catch {
      onSuccess("error", "Import failed — check your connection.");
    } finally {
      setImporting(false);
    }
  }

  const grantable = apps.filter((a) => a.restricted && a.status !== "archived");
  const allSelected = results.length > 0 && selected.size === results.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="portal-card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--color-border-soft) px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-(--color-surface-2)">
              <Download className="h-4 w-4 text-(--color-ssp-ink-800)" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-(--color-ssp-ink-900)">Import from Entra</h2>
              <p className="text-xs text-(--color-muted)">Pre-provision employees before their first portal sign-in</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="focus-ring rounded-lg p-1.5 text-(--color-muted) transition hover:bg-(--color-surface-2)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search — auto fires as you type */}
        <div className="border-b border-(--color-border-soft) px-6 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--color-subtle)" />
            {searching && (
              <div className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin rounded-full border-2 border-(--color-border) border-t-(--color-ssp-ink-800)" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or email…"
              className="focus-ring w-full rounded-lg border border-(--color-border) bg-(--color-surface-1) py-2 pl-9 pr-9 text-sm text-(--color-text) placeholder:text-(--color-subtle)"
            />
          </div>
        </div>

        {/* Results */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {searchError && (
            <div className="m-4 rounded-xl border-l-4 border-l-(--color-brand-600) bg-(--color-surface-1) px-4 py-3 text-sm text-(--color-text)">
              {searchError}
            </div>
          )}

          {!hasSearched && !searching && (
            <div className="px-6 py-12 text-center text-sm text-(--color-subtle)">
              Start typing to search for employees in your Entra tenant.
            </div>
          )}

          {hasSearched && !searching && results.length === 0 && !searchError && (
            <div className="px-6 py-12 text-center text-sm text-(--color-subtle)">
              No matching employees found.
            </div>
          )}

          {results.length > 0 && (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--color-border-soft) bg-(--color-surface-0)">
                  <th className="px-4 py-3">
                    <button
                      onClick={toggleAll}
                      className="text-(--color-muted) transition hover:text-(--color-text-strong)"
                    >
                      {allSelected
                        ? <CheckSquare className="h-4 w-4" />
                        : <Square className="h-4 w-4" />
                      }
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--color-subtle)">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--color-subtle)">Job / Dept.</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--color-subtle)">Portal status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border-soft)">
                {results.map((u) => {
                  const isChecked = selected.has(u.azureId);
                  return (
                    <tr
                      key={u.azureId}
                      onClick={() => toggle(u.azureId)}
                      className={cn(
                        "cursor-pointer transition",
                        isChecked
                          ? "bg-sky-50/60"
                          : "hover:bg-(--color-surface-0)"
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-(--color-ssp-ink-900)"
                          checked={isChecked}
                          onChange={() => toggle(u.azureId)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-(--color-text-strong)">{u.name || "—"}</p>
                        <p className="text-xs text-(--color-subtle)">{u.email}</p>
                        {!u.accountEnabled && (
                          <span className="text-xs text-(--color-brand-600)">Disabled in Entra</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-(--color-muted)">
                        {[u.jobTitle, u.department].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {u.alreadyImported ? (
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <Badge tone="neutral">{u.role}</Badge>
                              {u.appKeys.map((k) => (
                                <Badge key={k} tone="ok">{k}</Badge>
                              ))}
                            </div>
                            {isChecked && (
                              <p className="text-[11px] text-(--color-muted)">
                                Selecting will merge new grants
                              </p>
                            )}
                          </div>
                        ) : (
                          <Badge tone="warn">Not in portal</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Grant options + footer */}
        <div className="border-t border-(--color-border-soft) bg-(--color-surface-0) px-6 py-4">
          {selected.size > 0 && (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Company">
                <Select value={companyCode} onChange={(e) => setCompanyCode(e.target.value)}>
                  <option value="">— none —</option>
                  {org.companies.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Department">
                <Select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)}>
                  <option value="">— none —</option>
                  {org.departments.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </Select>
              </Field>
              {grantable.length > 0 && (
                <div className="sm:col-span-2">
                  <Field label="Grant app access">
                    <div className="flex flex-wrap gap-4 pt-1">
                      {grantable.map((app) => (
                        <label key={app.key} className="flex cursor-pointer items-center gap-2 text-sm text-(--color-text)">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-(--color-ssp-ink-900)"
                            checked={grantAppKeys.includes(app.key)}
                            onChange={(e) =>
                              setGrantAppKeys((prev) =>
                                e.target.checked ? [...prev, app.key] : prev.filter((k) => k !== app.key)
                              )
                            }
                          />
                          {app.name}
                        </label>
                      ))}
                    </div>
                  </Field>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-(--color-muted)">
              {selected.size > 0
                ? <><strong className="text-(--color-text-strong)">{selected.size}</strong> {selected.size === 1 ? "person" : "people"} selected</>
                : "Select employees above to import"
              }
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={runImport} disabled={importing || selected.size === 0}>
                {importing
                  ? "Importing…"
                  : selected.size > 0
                    ? `Import ${selected.size} ${selected.size === 1 ? "person" : "people"}`
                    : "Import"
                }
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
