# SSP Portal – Local Development Setup

Local development runs over **plain HTTP on localhost**. There is no reverse proxy or HTTPS terminator (Caddy was removed).

## Layout

| App                               | Typical URL                     |
| --------------------------------- | ------------------------------- |
| **SSP Portal** (auth + dashboard) | `http://localhost:3000`         |
| Dependent apps (DriveDock, etc.)  | `http://localhost:<other-port>` |

Browsers treat cookies by **hostname**, not port. A session cookie set for `localhost` on port 3000 is therefore available to other apps on the same host at different ports.

## Auth flow

```
Subapp (e.g. :4000)          Portal (:3000)              Microsoft Entra
       |                           |                            |
       |  no SSP_AUTH_TOKEN        |                            |
       |-------------------------->|  /login?callbackUrl=…      |
       |                           |--------------------------->|
       |                           |<---------------------------|
       |                           |  set SSP_AUTH_TOKEN        |
       |                           |  (Domain=localhost,        |
       |                           |   Secure off for HTTP)     |
       |<--------------------------|  redirect to callbackUrl   |
       |                           |                            |
       |  GET /api/v1/auth/me      |                            |
       |  (Cookie: SSP_AUTH_TOKEN) |                            |
       |-------------------------->|                            |
       |<--------------------------|  user + access.apps        |
```

1. User opens a dependent app on another localhost port.
2. If the shared cookie is missing, the app redirects to the portal login with a `callbackUrl` back to itself (e.g. `http://localhost:4000/...`).
3. User signs in with Microsoft on the portal.
4. Portal sets `SSP_AUTH_TOKEN` for `localhost` (non-Secure so it works on HTTP).
5. Portal redirects to the whitelisted `callbackUrl`.
6. The subapp calls `http://localhost:3000/api/v1/auth/me` with credentials included so the browser sends the cookie. The response is the source of truth for identity and app access.

## Portal env (`.env.local`)

```env
NEXT_PUBLIC_ORIGIN=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000

AUTH_COOKIE_NAME=SSP_AUTH_TOKEN
AUTH_COOKIE_DOMAIN=localhost

# Must include localhost so subapp callbackUrls are accepted
NEXT_PUBLIC_ALLOWED_CALLBACK_HOSTS=localhost,...
```

`AUTH_COOKIE_SECURE` is derived in code from `NEXT_PUBLIC_ORIGIN`: `http://` → cookies are not Secure; `https://` (production) → Secure.

Login allows `http://` callback URLs only for `localhost` / `127.0.0.1`. Production hosts still require `https://`.

## Running the portal

```bash
cd frontend
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

## What dependent apps should do

1. **Detect session** — Call `GET http://localhost:3000/api/v1/auth/me` with `credentials: "include"` (or forward the `SSP_AUTH_TOKEN` cookie from the request).
2. **Send unauthenticated users to portal login** — Redirect to:
   ```
   http://localhost:3000/login?callbackUrl=<encoded-absolute-http-url-back-to-this-app>
   ```
3. **Do not maintain a separate user store** — Use `/api/v1/auth/me` as the identity contract.
4. **Logout** — Send users to `http://localhost:3000/api/auth/logout` so the shared cookie is cleared for all apps.

### Example: fetch identity from a subapp

```ts
const res = await fetch("http://localhost:3000/api/v1/auth/me", {
  credentials: "include",
});

if (res.status === 401) {
  const callbackUrl = encodeURIComponent(window.location.href);
  window.location.href = `http://localhost:3000/login?callbackUrl=${callbackUrl}`;
  return;
}

const me = await res.json();
// me.user, me.access.apps
```

## Production note

In production the portal and subapps sit on real HTTPS hosts. The same cookie-sharing idea applies via a shared parent domain (`AUTH_COOKIE_DOMAIN`) and Secure cookies. Locally, hostname `localhost` + HTTP replaces that setup.

## Vercel preview (`*.vercel.app`)

Do **not** set `AUTH_COOKIE_DOMAIN=vercel.app`. That domain is on the [Public Suffix List](https://publicsuffix.org/), so browsers refuse the cookie and login appears to succeed then bounce back to `/login`.

For a single-host preview deploy, leave `AUTH_COOKIE_DOMAIN` unset (host-only cookie on `sspportal-dev.vercel.app`). For cookie sharing with other preview apps, put the portal on a custom subdomain of your own domain (e.g. `dev.ssp4you.com`) and set `AUTH_COOKIE_DOMAIN=ssp4you.com`.
