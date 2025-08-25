"use client";

import Link from "next/link";
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

const appLinks: Record<string, string> = {
  DriveDock: process.env.NEXT_PUBLIC_DRIVEDOCK_URL || "#",
  DispatchSafe: process.env.NEXT_PUBLIC_DISPATCHSAFE_URL || "#",
  GlobalOps: process.env.NEXT_PUBLIC_GLOBALOPS_URL || "#",
  SalesTool: "#",
  "DV Manager": "#",
  LedgerX: "#",
  HRDock: process.env.NEXT_PUBLIC_HRDOCK_URL || "#",
};

export default function Sidebar({ isOpen, toggle, isDesktop }: SidebarProps) {
  const pathname = usePathname();

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
      {/* Top bar with close (mobile only) */}
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

      {/* Desktop top bar with full-circle glass-style close button */}
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

      {/* Sidebar Content */}
      <div className="px-6 py-2 mt-2 space-y-4 overflow-y-auto flex-1">
        {Object.entries(departments).map(([dept, apps], index, arr) => (
          <div key={dept}>
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              {dept}
            </h3>
            <ul className="space-y-1">
              {apps.map((app) => {
                const href = appLinks[app] || "#";
                const isActive = pathname === href;

                return (
                  <li key={app}>
                    <Link
                      href={href}
                      target="_blank" // Optional: open in new tab
                      rel="noopener noreferrer"
                      className={cn(
                        "block text-sm px-3 py-2 rounded-md transition",
                        isActive
                          ? "bg-white/10 text-white font-semibold"
                          : "text-gray-200 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {app}
                    </Link>
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
