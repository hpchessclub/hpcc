export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "Howick-Pakuranga Chess Club",
  description: "Howick-Pakuranga Chess Club serving Howick and Pakuranga.",
  manifest: "/manifest.webmanifest",
  applicationName: "Howick-Pakuranga Chess Club",
  appleWebApp: {
    capable: true,
    title: "HPCC",
    statusBarStyle: "black-translucent"
  },
  icons: {
    icon: [
      { url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><PWARegister />{children}</body>
    </html>
  );
}
