# Capacitor / iOS dev: point the app at your Next.js server

The native shell loads **either** static files from `www/` **or** a remote URL from `server.url` in `capacitor.config.*`.

Poster creation, story APIs, and other features call `fetch("/api/...")` relative to the **current WebView origin**. If `server.url` is missing:

- iOS may run the **bundled** `www/` build, which has **no** Next.js API routes.
- Requests to `/api/poster` fail (often as a **client fetch error**), and the app falls back to **genre artwork** with a hint about reaching the app server.

## Local development (LAN)

1. Start Next on your machine: `npm run dev` (default `http://localhost:3000`).
2. Find your machine’s **LAN IP** (e.g. `192.168.1.42`).
3. From the project root, sync Capacitor with a live server URL (cleartext HTTP is enabled when the URL starts with `http://`):

```bash
CAP_SERVER_URL=http://192.168.1.42:3000 npm run cap:sync
```

4. Open the iOS project in Xcode, **rebuild**, and run on simulator or device.

After **any** change to `.env`, server code, or `capacitor.config.ts`, restart `npm run dev` and re-run `cap:sync` if `CAP_SERVER_URL` changed.

## Production

Use HTTPS:

```bash
CAP_SERVER_URL=https://your-domain.com npm run cap:sync
```

## Reference

- Root `capacitor.config.ts` reads `CAP_SERVER_URL` and sets `server.url` when present.
- `ios/App/App/capacitor.config.json` is **generated/updated by Capacitor** when you run `cap sync`; editing it by hand is not the source of truth unless you stop using the TypeScript config.
