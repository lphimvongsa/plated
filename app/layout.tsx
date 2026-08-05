import type { Metadata, Viewport } from "next";
import { Caveat, Cormorant_Garamond, DM_Sans } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/sw-register";
import "./globals.css";

const editorial = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-editorial",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const handwritten = Caveat({
  subsets: ["latin"],
  variable: "--font-handwritten",
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "plated. — dinner parties, planned beautifully", template: "%s | plated." },
  description: "A collaborative dinner-party planner for menus, recipes, shopping, guests, costs, and timelines.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "plated.", statusBarStyle: "default" },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#f4f0e7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${editorial.variable} ${sans.variable} ${handwritten.variable}`}>
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
