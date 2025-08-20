"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react"; // keep in Portal only
import { ChevronDown } from "lucide-react";
import ProfileAvatar from "@/components/ui/ProfileAvatar";
import { NEXT_PUBLIC_ORIGIN } from "@/app/config/env";

interface NavbarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export default function Navbar({ toggleSidebar, isSidebarOpen }: NavbarProps) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Build logout URL -> /api/auth/logout (Portal route)
  const portalBase = NEXT_PUBLIC_ORIGIN || "";
  const logoutHref = portalBase ? new URL("/api/auth/logout", portalBase).toString() : "/api/auth/logout";

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 bg-white shadow-md">
      {/* Hamburger (mobile only) */}
      <button
        onClick={toggleSidebar}
        title={isSidebarOpen ? "Close menu" : "Open menu"}
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white text-black shadow-md transition-all duration-300"
      >
        <svg
          className={`w-5 h-5 text-white transition-transform duration-500 ease-in-out ${isSidebarOpen ? "rotate-90 scale-110" : ""}`}
          fill="#000"
          stroke="#000"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
        </svg>
      </button>

      {/* Centered Logo */}
      <div className="absolute left-1/2 transform -translate-x-1/2">
        <Image src="/images/SSP-Truck-LineFullLogo.png" alt="SSP Logo" width={130} height={40} className="w-[90px] sm:w-[110px] md:w-[130px] h-auto object-contain" priority />
      </div>

      {/* Right: User + Dropdown */}
      <div className="ml-auto flex items-center gap-2 relative" ref={dropdownRef}>
        <button onClick={() => setDropdownOpen((prev) => !prev)} className="flex items-center gap-2 focus:outline-none" aria-haspopup="menu" aria-expanded={dropdownOpen}>
          <ProfileAvatar size={32} />
          <span className="hidden sm:inline text-xs sm:text-sm font-medium text-gray-700">{userName}</span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-12 mt-1 w-40 bg-white rounded-md shadow-md py-2 z-50" role="menu">
            {/* Navigate to /api/auth/logout (server clears cookie + redirects to /login) */}
            <a href={logoutHref} className="block w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition" role="menuitem" onClick={() => setDropdownOpen(false)}>
              Logout
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
