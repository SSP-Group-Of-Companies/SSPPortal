"use client";

import { useEffect, useState, useRef } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface DashboardShellProps {
  children: React.ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Detect screen size
  useEffect(() => {
    const checkScreen = () => setIsDesktop(window.innerWidth >= 1024);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  // Sidebar does NOT open by default
  useEffect(() => {
    setSidebarOpen(false);
  }, [isDesktop]);

  // Mobile: close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !isDesktop &&
        sidebarRef.current &&
        !sidebarRef.current.contains(e.target as Node)
      ) {
        setSidebarOpen(false);
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [sidebarOpen, isDesktop]);

  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-br from-black via-neutral-900 to-gray-900 bg-fixed">
      {/* Dark background for glass backdrop effect */}
      <div className="fixed inset-y-0 left-0 w-64 bg-black z-10" />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-all duration-500 ease-in-out will-change-transform
          ${
            sidebarOpen
              ? "translate-x-0 opacity-100 scale-100"
              : "-translate-x-full opacity-0 scale-[0.98]"
          }`}
      >
        <Sidebar
          isOpen={sidebarOpen}
          toggle={() => setSidebarOpen(!sidebarOpen)}
          isDesktop={isDesktop}
        />
      </div>

      {/* Overlay when sidebar is open */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm transition-opacity duration-500 ease-in-out" />
      )}

      {isDesktop && !sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          title="Open sidebar"
          className="group fixed top-[.5rem] left-10 z-50 w-10 h-10 bg-white text-black border border-gray-200 shadow-md rounded-full flex items-center justify-center hover:bg-gray-100 hover:ring-2 hover:ring-gray-50 transition-all"
        >
          <svg
            className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
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
      )}

      {/* Main Content */}
      <div className="relative z-20 flex flex-col h-full">
        <Navbar
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          isSidebarOpen={sidebarOpen}
        />
        <main className="flex-1 overflow-y-auto pt-16 lg:pt-6">{children}</main>
      </div>
    </div>
  );
}
