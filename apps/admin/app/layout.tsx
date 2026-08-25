import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "../src/lib/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Console Teko",
  description: "Administration Teko — KYC, cartographie, finance, paramètres.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3D0F5C",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
