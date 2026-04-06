import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS shell loads your deployed Next.js app when `server.url` is set.
 * Dev LAN: CAP_SERVER_URL=http://192.168.x.x:3000 npm run cap:sync
 * Production: CAP_SERVER_URL=https://your-domain.com npm run cap:sync
 * Omit CAP_SERVER_URL to show the placeholder in `www/` (offline / CI only).
 */
const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "com.bedtimestory.app",
  appName: "Bedtime Story",
  webDir: "www",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
        },
      }
    : {}),
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
      backgroundColor: "#0c1222",
    },
  },
};

export default config;
