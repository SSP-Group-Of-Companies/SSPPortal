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

  // The full list fetched from Entra (reset when a new search fires)
  const [allResults, setAllResults] = useState<GraphResult[]>([]);
  // What the user sees — filtered client-side while a new fetch is in flight
  const [displayResults, setDisplayResults] = useState<GraphResult[]>([]);

  const [loading, setLoading] = useState(true); // initial load
  const [searching, setSearching] = useState(false); // subsequent searches
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [apps, setApps] = useState<RegistryApp[]>([]);
  const [org, setOrg] = useState<OrgData>({ companies: [], departments: [] });
  const [grantAppKeys, setGrantAppKeys] = useState<string[]>([]);
  const [companyCode, setCompanyCode] = useState("");
  const [departmentCode, setDepartmentCode] = useState("");
  const [importing, setImporting] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestIdRef = useRef(0);
  const lastFetchedQueryRef = useRef<string | null>(null);

  const fetchDirectory = useCallback(async (q: string) => {
    lastFetchedQueryRef.current = q;
    const id = ++requestIdRef.current;
    if (q.trim()) setSearching(true);
    try {
      const res = await fetch(`/api/admin/directory/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (id !== requestIdRef.current) return;
      if (!res.ok) {
        setLoadError(data.error ?? "Failed to load the Entra directory.");
        return;
      }
      const users: GraphResult[] = data.users ?? [];
      setAllResults(users);
      setDisplayResults(users);
      // Prune selections that no longer exist in the results instead of
      // wiping everything — clicks made while a fetch was in flight survive.
      setSelected((prev) => {
        const valid = new Set(users.map((u) => u.azureId));
        return new Set([...prev].filter((id) => valid.has(id)));
      });
      setLoadError(null);
    } catch {
      if (id !== requestIdRef.current) return;
      setLoadError("Could not reach the directory. Check your connection.");
    } finally {
      if (id === requestIdRef.current) {
        setLoading(false);
        setSearching(false);
      }
    }
  }, []);

  // Load full list on mount
  useEffect(() => {
    inputRef.current?.focus();
    void fetchDirectory("");
    void (async () => {
      const [appsRes, orgRes] = await Promise.all([fetch("/api/admin/apps"), fetch("/api/admin/organization")]);
      const [appsData, orgData] = await Promise.all([appsRes.json(), orgRes.json()]);
      setApps(appsData.apps ?? []);
      setOrg({ companies: orgData.companies ?? [], departments: orgData.departments ?? [] });
    })();
  }, [fetchDirectory]);

  // When user types: instantly filter the in-memory list for immediate feedback,
  // then debounce a real Graph search for anything the local cache might miss.
  //
  // allResults is intentionally NOT in the dependency array. When a fetch lands,
  // fetchDirectory already calls setDisplayResults directly. Including allResults
  // here creates a feedback loop:
  //   allResults changes → effect fires → debounce → fetchDirectory → setSelected(new Set())
  //   → selection wiped every 400 ms, making checkboxes impossible to hold.
  useEffect(() => {
    const q = query.trim().toLowerCase();
    setDisplayResults(
      q
        ? allResults.filter(
            (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
          )
        : allResults
    );

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Skip if this exact query was already fetched (e.g. the mount load) —
      // avoids a redundant Graph round trip and any churn it causes.
      if (lastFetchedQueryRef.current !== query) void fetchDirectory(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // allResults intentionally excluded — see comment above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, fetchDirectory]);

  function toggle(azureId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(azureId)) next.delete(azureId);
      else next.add(azureId);
      return next;
    });
  }

  // "Select all" operates on the visible rows only, and must not clobber
  // selections hidden by the current filter.
  function toggleAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      const everyVisibleSelected = displayResults.length > 0 && displayResults.every((r) => next.has(r.azureId));
      for (const r of displayResults) {
        if (everyVisibleSelected) next.delete(r.azureId);
        else next.add(r.azureId);
      }
      return next;
    });
  }

  async function runImport() {
    // Import from the full fetched list, not the filtered view — a search
    // typed after selecting must not silently drop hidden selections.
    const chosen = allResults.filter((r) => selected.has(r.azureId));
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
        onSuccess("error", data.error ?? "Import failed.");
        return;
      }
      const parts: string[] = [];
      if (data.created) parts.push(`${data.created} employee${data.created !== 1 ? "s" : ""} added to the portal`);
      if (data.updated) parts.push(`${data.updated} updated with new grants`);
      if (data.skipped) parts.push(`${data.skipped} already up to date`);
      onSuccess("Import complete", parts.length ? parts.join(", ") : "No changes were needed.");
      setSelected(new Set());
      onImported();
      void fetchDirectory(query);
    } catch {
      onSuccess("error", "Import failed. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  const grantable = apps.filter((a) => a.restricted && a.status !== "archived");
  const allSelected = displayResults.length > 0 && displayResults.every((r) => selected.has(r.azureId));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      {/* Fixed height — content inside scrolls; the shell never resizes */}
      <div
        className="portal-card flex h-[min(90vh,680px)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-(--color-border-soft) px-6 py-4">
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

        {/* Search */}
        <div className="shrink-0 border-b border-(--color-border-soft) px-6 py-3">
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

        {/* Scrollable results — fills all remaining space */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && (
            <div className="space-y-0">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-(--color-border-soft) px-4 py-3.5">
                  <div className="h-4 w-4 rounded bg-(--color-surface-2)" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-40 rounded bg-(--color-surface-2)" />
                    <div className="h-3 w-56 rounded bg-(--color-surface-2)" />
                  </div>
                  <div className="h-5 w-20 rounded-full bg-(--color-surface-2)" />
                </div>
              ))}
            </div>
          )}

          {!loading && loadError && (
            <div className="m-4 rounded-xl border-l-4 border-l-(--color-brand-600) bg-(--color-surface-1) px-4 py-3 text-sm text-(--color-text)">
              {loadError}
            </div>
          )}

          {!loading && !loadError && (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-(--color-border-soft) bg-(--color-surface-0)">
                  <th className="px-4 py-3">
                    <button
                      onClick={toggleAll}
                      className="text-(--color-muted) transition hover:text-(--color-text-strong)"
                    >
                      {allSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--color-subtle)">Employee</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--color-subtle)">Job / Dept.</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-(--color-subtle)">Portal status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--color-border-soft)">
                {displayResults.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-(--color-subtle)">
                      No matching employees found.
                    </td>
                  </tr>
                ) : (
                  displayResults.map((u) => {
                    const isChecked = selected.has(u.azureId);
                    return (
                      <tr
                        key={u.azureId}
                        onClick={() => toggle(u.azureId)}
                        className={cn(
                          "cursor-pointer transition",
                          isChecked ? "bg-sky-50/60" : "hover:bg-(--color-surface-0)"
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
                                {u.appKeys.map((k) => <Badge key={k} tone="ok">{k}</Badge>)}
                              </div>
                              {isChecked && (
                                <p className="text-[11px] text-(--color-muted)">Selecting will merge new grants</p>
                              )}
                            </div>
                          ) : (
                            <Badge tone="warn">Not in portal</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer — always same structure, no height change */}
        <div className="shrink-0 border-t border-(--color-border-soft) bg-(--color-surface-0) px-6 py-4">
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Company">
              <Select value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} disabled={selected.size === 0}>
                <option value="">— none —</option>
                {org.companies.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Department">
              <Select value={departmentCode} onChange={(e) => setDepartmentCode(e.target.value)} disabled={selected.size === 0}>
                <option value="">— none —</option>
                {org.departments.map((d) => <option key={d.code} value={d.code}>{d.name}</option>)}
              </Select>
            </Field>
            {grantable.length > 0 && (
              <div className="sm:col-span-2">
                <Field label="Grant app access">
                  <div className="flex flex-wrap gap-4 pt-1">
                    {grantable.map((app) => (
                      <label
                        key={app.key}
                        className={cn(
                          "flex items-center gap-2 text-sm text-(--color-text)",
                          selected.size === 0 ? "cursor-not-allowed opacity-50" : "cursor-pointer"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-(--color-ssp-ink-900)"
                          checked={grantAppKeys.includes(app.key)}
                          disabled={selected.size === 0}
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

          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-(--color-muted)">
              {selected.size > 0 ? (
                <><strong className="text-(--color-text-strong)">{selected.size}</strong> {selected.size === 1 ? "person" : "people"} selected</>
              ) : (
                `${displayResults.length} ${displayResults.length === 1 ? "employee" : "employees"} shown`
              )}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose}>Close</Button>
              <Button onClick={runImport} disabled={importing || selected.size === 0}>
                {importing
                  ? "Importing…"
                  : selected.size > 0
                    ? `Import ${selected.size} ${selected.size === 1 ? "person" : "people"}`
                    : "Import"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
