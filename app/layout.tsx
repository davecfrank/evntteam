import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegistration from "./components/ServiceWorkerRegistration";
import PWAInstallProvider from "./components/PWAInstallProvider";
import PWAInstallBanner from "./components/PWAInstallBanner";
import PWAUpdateToast from "./components/PWAUpdateToast";
import PushNotificationManager from "./components/PushNotificationManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "evnt.team",
  description: "Plan unforgettable experiences with your team",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "evnt.team",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon-120x120.png", sizes: "120x120" },
      { url: "/icons/apple-touch-icon-152x152.png", sizes: "152x152" },
      { url: "/icons/apple-touch-icon-167x167.png", sizes: "167x167" },
      { url: "/icons/apple-touch-icon-180x180.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "evnt.team",
    description: "Plan unforgettable experiences with your team",
    url: "https://evnt.team",
    siteName: "evnt.team",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF4D00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ServiceWorkerRegistration />
        <PushNotificationManager />
        <PWAInstallProvider>
          {children}
          <PWAInstallBanner />
        </PWAInstallProvider>
        <PWAUpdateToast />
      </body>
    </html>
  );
}
