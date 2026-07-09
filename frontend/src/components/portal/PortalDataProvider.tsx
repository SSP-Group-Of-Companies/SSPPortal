"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface PortalApp {
  key: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  departmentCode: string;
  status: string; // "active" | "beta" | "coming_soon"
  restricted: boolean;
  sortOrder: number;
  hasAccess: boolean;
  accessVia: string | null;
}

export interface PortalUser {
  name: string;
  email: string;
  role: string;
  companyCode: string;
  departmentCode: string;
}

interface PortalData {
  apps: PortalApp[];
  departments: { code: string; name: string }[];
  pendingRequests: string[];
  user: PortalUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const PortalDataContext = createContext<PortalData>({
  apps: [],
  departments: [],
  pendingRequests: [],
  user: null,
  loading: true,
  error: null,
  refresh: async () => {},
});

export function usePortalData() {
  return useContext(PortalDataContext);
}

/** Fetches the resolved app catalogue once and shares it with the shell (sidebar, launcher, navbar). */
export default function PortalDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<PortalData, "refresh">>({
    apps: [],
    departments: [],
    pendingRequests: [],
    user: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/my-apps", { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load portal data (${res.status})`);
      const data = await res.json();
      setState({
        apps: data.apps ?? [],
        departments: data.departments ?? [],
        pendingRequests: data.pendingRequests ?? [],
        user: data.user ?? null,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load portal data",
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <PortalDataContext.Provider value={{ ...state, refresh }}>{children}</PortalDataContext.Provider>;
}
