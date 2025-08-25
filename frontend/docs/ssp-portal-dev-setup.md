# SSP Portal – Local HTTPS Setup with Caddy

This configuration sets up **SSP Portal** on `sspportal.lvh.me` with HTTPS locally using [Caddy](https://caddyserver.com/).

```caddyfile
sspportal.lvh.me:3443 {
    tls internal
    reverse_proxy 127.0.0.1:3000
}
```

## How to Run

1. Download the latest Caddy binary from the [official website](https://caddyserver.com/download).

2. Open a terminal in the folder where `caddy.exe` (Windows) or `caddy` (Mac/Linux) is located.

3. Run:

   **Windows**

   ```bash
   .\caddy.exe run --config "C:\Users\<YourUser>\projects\SSP-Portal\CaddyFile"
   ```

   **Mac/Linux**

   ```bash
   ./caddy run --config ~/projects/SSP-Portal/CaddyFile
   ```

4. Ensure your Next.js app is running locally on `http://localhost:3000`.

5. Visit [https://sspportal.lvh.me:3443](https://sspportal.lvh.me:3443) in your browser.
