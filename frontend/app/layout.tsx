import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "CA-OS | AI Operating System for Chartered Accountants",
  description: "Run your entire CA practice from one intelligent platform. Compliance, clients, AI drafts, and billing — unified.",
  keywords: "CA software, GST filing, compliance management, chartered accountant",
  openGraph: {
    title: "CA-OS",
    description: "AI-native practice management for Indian CA firms",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </body>
    </html>
  );
}
