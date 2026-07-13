import { AZURE_AD_CLIENT_ID, AZURE_AD_CLIENT_SECRET, AZURE_AD_TENANT_ID } from "@/app/config/env";

/**
 * App-only Microsoft Graph client (client-credentials flow).
 *
 * Used exclusively by the admin "Import from Entra" tool to browse/search
 * the tenant's user list server-side. This is a separate credential flow
 * from the delegated Azure AD sign-in used by employees — no employee
 * interaction or consent screen is involved, and it never touches the
 * shared session cookie.
 *
 * Requires the Microsoft Graph Application permission `User.Read.All`
 * (admin consent granted) on the same app registration used for portal SSO.
 */

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAppOnlyToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const res = await fetch(`https://login.microsoftonline.com/${AZURE_AD_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: AZURE_AD_CLIENT_ID,
      client_secret: AZURE_AD_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to acquire Graph app-only token (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

export interface GraphDirectoryUser {
  /** Entra object id — the same value that lands as `oid` on sign-in. */
  azureId: string;
  email: string;
  name: string;
  jobTitle: string;
  department: string;
  accountEnabled: boolean;
}

function mapGraphUser(u: Record<string, unknown>): GraphDirectoryUser {
  return {
    azureId: String(u.id ?? ""),
    email: String(u.mail ?? u.userPrincipalName ?? "").toLowerCase(),
    name: String(u.displayName ?? ""),
    jobTitle: String(u.jobTitle ?? ""),
    department: String(u.department ?? ""),
    accountEnabled: u.accountEnabled !== false,
  };
}

const SELECT = "id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled,userType";

/**
 * Browse or search tenant member accounts (guests excluded). With no query,
 * returns the first page ordered by name; with a query, performs a Graph
 * `$search` across name/email. Both modes require the `ConsistencyLevel:
 * eventual` header per Microsoft Graph's advanced query rules.
 */
export async function listDirectoryUsers(query: string, top = 50): Promise<GraphDirectoryUser[]> {
  const token = await getAppOnlyToken();
  const q = query.trim();

  const url = new URL("https://graph.microsoft.com/v1.0/users");
  url.searchParams.set("$select", SELECT);
  url.searchParams.set("$top", String(Math.min(Math.max(top, 1), 100)));
  url.searchParams.set("$filter", "userType eq 'Member'");
  url.searchParams.set("$count", "true");

  if (q) {
    const escaped = q.replace(/"/g, '\\"');
    url.searchParams.set("$search", `"displayName:${escaped}" OR "mail:${escaped}" OR "userPrincipalName:${escaped}"`);
  } else {
    url.searchParams.set("$orderby", "displayName");
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: "eventual" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Microsoft Graph request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { value?: Record<string, unknown>[] };
  return (data.value ?? []).map(mapGraphUser).filter((u) => u.azureId && u.email);
}
