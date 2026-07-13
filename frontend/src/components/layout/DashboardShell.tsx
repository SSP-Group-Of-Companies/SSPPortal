"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import PortalDataProvider from "@/components/portal/PortalDataProvider";

interface DashboardShellProps {
  children: React.ReactNode;
}

/**
 * Portal shell: persistent dark sidebar on desktop, overlay on mobile,
 * light content surface. Data (apps, departments, role) is fetched once
 * here and shared with the sidebar, navbar, and page content.
 */
export default function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkScreen = () => setIsDesktop(window.innerWidth >= 1024);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    if (isDesktop) setSidebarOpen(false);
  }, [isDesktop]);

  return (
    <PortalDataProvider>
      <div className="min-h-screen bg-(--color-surface-0)">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} isDesktop={isDesktop} />

        {/* Mobile overlay behind the sidebar */}
        {sidebarOpen && !isDesktop && (
          <div
            className="fixed inset-0 z-35 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
        )}

        <div className="flex min-h-screen flex-col lg:pl-68">
          <Navbar onToggleSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </PortalDataProvider>
  );
}
