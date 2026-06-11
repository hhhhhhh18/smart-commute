import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import Providers from "./providers";
import PWAShell from "@/components/PWAShell";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smart Commute – Hyderabad",
  description:
    "All Routes. One Destination. Find TSRTC bus, Metro, Bike and Car routes in Hyderabad.",
  manifest: "/manifest.json",
  themeColor: "#1565C0",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Smart Commute",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <Providers>
          <PWAShell>
            {children}
          </PWAShell>
        </Providers>
      </body>
    </html>
  );
}