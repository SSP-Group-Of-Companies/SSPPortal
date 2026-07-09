"use client";

import { Suspense, useMemo, useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import { NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS, NEXT_PUBLIC_ORIGIN } from "../config/env";

/** Only allow callback URLs on the portal itself or whitelisted subapp hosts. */
function isAllowedCallback(urlStr: string | null): string | null {
  if (!urlStr) return null;

  // Allow relative URLs
  if (urlStr.startsWith("/")) return urlStr;

  try {
    const url = new URL(urlStr);

    if (url.protocol !== "https:") return null;

    const allowedHosts = (NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS ?? "")
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);

    const portalOrigin = NEXT_PUBLIC_ORIGIN;
    const portalHostname = portalOrigin ? new URL(portalOrigin).hostname : "";

    const hostname = url.hostname;

    const hostnameAllowed = hostname === portalHostname || allowedHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));

    if (!hostnameAllowed) return null;

    return url.toString();
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
  const [signingIn, setSigningIn] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-(--color-surface-0)">
      {/* Subtle ink wash at the top, echoing the sspgroup.com hero language */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72"
        style={{
          background:
            "linear-gradient(180deg, rgba(11,62,94,0.08) 0%, rgba(16,167,216,0.04) 55%, transparent 100%)",
        }}
        aria-hidden
      />

      <main className="relative flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8 text-center">
          <Image
            src="/images/SSP-Truck-LineFullLogo.png"
            alt="SSP Group of Companies"
            width={180}
            height={60}
            priority
            className="mx-auto h-auto w-40 object-contain md:w-44"
          />
        </div>

        <div className="portal-card w-full max-w-md rounded-2xl p-8">
          <h1 className="text-center text-xl font-semibold tracking-tight text-(--color-ssp-ink-900)">
            SSP Portal
          </h1>
          <p className="mt-1.5 text-center text-sm text-(--color-muted)">
            One sign-in for every SSP internal system.
          </p>

          <button
            onClick={() => {
              setSigningIn(true);
              signIn("azure-ad", { callbackUrl: safeCallbackUrl });
            }}
            disabled={signingIn || status === "loading"}
            className="focus-ring mt-8 flex w-full items-center justify-center gap-2.5 rounded-lg bg-(--color-ssp-ink-900) px-4 py-3 text-sm font-semibold text-white transition hover:bg-(--color-ssp-ink-800) disabled:opacity-70"
          >
            <Image src="/images/microsoft-logo.png" alt="" width={18} height={18} />
            {signingIn ? "Redirecting to Microsoft…" : "Sign in with Microsoft"}
          </button>

          <p className="mt-5 text-center text-xs leading-relaxed text-(--color-subtle)">
            Use your SSP company Microsoft account. Access to individual
            applications is managed by your administrators.
          </p>
        </div>

        <footer className="mt-10 text-center text-xs text-(--color-subtle)">
          © {new Date().getFullYear()} SSP Group of Companies · Internal systems — authorized users only
        </footer>
      </main>
    </div>
  );
}
