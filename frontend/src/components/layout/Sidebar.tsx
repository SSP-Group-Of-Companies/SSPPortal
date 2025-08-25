"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  isDesktop: boolean;
}

const departments = {
  Safety: ["DriveDock"],
  Dispatch: ["DispatchSafe"],
  Global: ["GlobalOps"],
  Sales: ["SalesTool"],
  Accounting: ["LedgerX"],
  "Dry Van Division": ["DV Manager"],
  HR: ["HRDock"],
};

// Use full URLs for externally hosted apps
const appRoutes: Record<string, string> = {
  DriveDock: "https://drivedock.vercel.app/dashboard/home",
  DispatchSafe: "https://dispatchsafe.vercel.app", // update as needed
  GlobalOps: "https://globalops.vercel.app",
  SalesTool: "https://sales.vercel.app",
  LedgerX: "https://ledgerx.vercel.app",
  "DV Manager": "https://dvmanager.vercel.app",
  HRDock: "https://hrdock.vercel.app",
};

export default function Sidebar({ isOpen, toggle, isDesktop }: SidebarProps) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 w-64 z-40 flex flex-col transition-all duration-500 ease-in-out transform will-change-transform",
        "bg-[rgba(0,0,0,0.60)] backdrop-blur-[50px] backdrop-saturate-150 border border-white/10 shadow-[inset_0_0_50px_rgba(255,255,255,0.05)]",
        isOpen
          ? "translate-x-0 opacity-100 scale-100 pointer-events-auto"
          : "-translate-x-full opacity-0 scale-[0.98] pointer-events-none"
      )}
    >
      {/* Close button */}
      {!isDesktop && (
        <div className="flex justify-end p-4">
          <button
            onClick={toggle}
            className="group w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white shadow-md backdrop-blur-sm transition-all duration-500"
            title="Close sidebar"
          >
            <svg
              className="w-4 h-4 rotate-180 transition-transform duration-600 ease-in-out group-hover:scale-110 group-hover:-translate-x-1"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>
      )}

      {isDesktop && (
        <div className="w-full h-14 flex items-center px-4">
          <div className="ml-auto">
            <button
              onClick={toggle}
              className="group w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all duration-300 shadow-md backdrop-blur-sm"
              title="Close sidebar"
            >
              <svg
                className="w-4 h-4 rotate-180 transition-transform duration-600 ease-in-out group-hover:scale-110 group-hover:-translate-x-1"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Sidebar content */}
      <div className="px-6 py-2 mt-2 space-y-4 overflow-y-auto flex-1">
        {Object.entries(departments).map(([dept, apps], index, arr) => (
          <div key={dept}>
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              {dept}
            </h3>
            <ul className="space-y-1">
              {apps.map((app) => {
                const href = appRoutes[app] || "#";

                return (
                  <li key={app}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "block text-sm px-3 py-2 rounded-md transition",
                        "text-gray-200 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {app}
                    </a>
                  </li>
                );
              })}
            </ul>
            {index < arr.length - 1 && (
              <hr className="my-4 border-t border-white/10" />
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
