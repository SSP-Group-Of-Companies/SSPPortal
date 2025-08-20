"use client";

import { Suspense, useMemo, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import Head from "next/head";
import { useSearchParams, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS, NEXT_PUBLIC_ORIGIN } from "../config/env";

// --- keep your helper as-is ---
function isAllowedCallback(urlStr: string | null): string | null {
  if (!urlStr) return null;

  // Allow relative URLs (e.g., "/dashboard")
  if (urlStr.startsWith("/")) return urlStr;

  try {
    const url = new URL(urlStr);
    const allowedHosts = (NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    const portalOrigin = NEXT_PUBLIC_ORIGIN;
    const portalHost = portalOrigin ? new URL(portalOrigin).host : "";

    const hostAllowed = url.host === portalHost || allowedHosts.some((h) => url.host === h || url.host.endsWith(`.${h}`));

    return hostAllowed ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Wrapper required so that the inner component (which uses useSearchParams)
 * is rendered within a Suspense boundary.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const fallbackAfterLogin = "/dashboard";

  const safeCallbackUrl = useMemo(() => {
    const fromQuery = searchParams.get("callbackUrl");
    return isAllowedCallback(fromQuery) ?? fallbackAfterLogin;
  }, [searchParams, fallbackAfterLogin]);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(safeCallbackUrl);
    }
  }, [status, router, safeCallbackUrl]);

  return (
    <>
      <Head>
        <title>SSP Portal | Login</title>
      </Head>

      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
        {/* Logo */}
        <div className="mb-6">
          <Image src="/images/SSP-Truck-LineFullLogo.png" alt="SSP Logo" width={180} height={140} priority />
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-1 text-center">Welcome to SSP Portal</h1>
        <p className="text-sm text-gray-600 mb-8 text-center">Centralized Access to Internal Systems</p>

        {/* Login Box */}
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 space-y-6">
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Email Address
              <span title="Disabled for now – full login with email/password coming soon" className="text-gray-400 cursor-help">
                ⓘ
              </span>
            </label>

            <div title="Disabled for now – full login with email/password coming soon">
              <input type="email" disabled placeholder="guest@example.com" className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" />
            </div>
          </div>

          {/* Password with toggle */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
              Password
              <span title="Disabled for now – full login with email/password coming soon" className="text-gray-400 cursor-help">
                ⓘ
              </span>
            </label>
            <div className="relative">
              <div title="Disabled for now – full login with email/password coming soon">
                <input type={showPassword ? "text" : "password"} disabled placeholder="••••••••" className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed" />
              </div>
              <button
                type="button"
                className="absolute inset-y-0 right-2 flex items-center text-gray-500"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Toggle Switch for Remember Me */}
          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={rememberMe} onChange={() => setRememberMe(!rememberMe)} />
                <div className={`block w-10 h-6 rounded-full transition ${rememberMe ? "bg-blue-600" : "bg-gray-300"}`} />
                <div className={`dot absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition ${rememberMe ? "translate-x-4" : ""}`} />
              </div>
              <span className="ml-3 text-sm text-gray-700">Remember Me</span>
            </label>
          </div>

          {/* Microsoft Login */}
          <div className="space-y-2">
            <p className="text-center font-medium text-sm text-gray-600">Company Employees</p>
            <button
              onClick={() => {
                signIn("azure-ad", { callbackUrl: safeCallbackUrl });
              }}
              className="w-full bg-black hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-md flex items-center justify-center gap-2 transition duration-200 cursor-pointer"
            >
              <Image src="/images/microsoft-logo.png" alt="Microsoft Logo" width={20} height={20} />
              <span>Sign In With Microsoft</span>
            </button>
          </div>
        </div>

        <footer className="mt-10 text-xs text-gray-500 text-center">© SSP Group of Companies 2025</footer>
      </div>
    </>
  );
}
