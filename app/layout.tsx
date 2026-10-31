import type { Metadata, Viewport } from "next";
import { CapacitorNativeShell } from "@/app/components/CapacitorNativeShell";
import { BRAND_NAME, BRAND_PROMISE } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: BRAND_NAME,
    template: `%s — ${BRAND_NAME}`,
  },
  description: BRAND_PROMISE,
  applicationName: BRAND_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: BRAND_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#11182B",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}<CapacitorNativeShell /></body>
    </html>
  );
}
