import type { Metadata } from "next";
import Script from "next/script";
import "./style.css";
import { CurrencyProvider } from "@/components/layout/CurrencyProvider";
import RootShell from "@/components/layout/RootShell";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "PabloSMM - Social Media Marketing Panel",
  description: "Grow your social media presence with affordable Instagram, YouTube, Facebook, X, and TikTok services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="cryptomus" content="e01f06fd" />
      </head>
      <body>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-S9HL88JSY2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-S9HL88JSY2');
          `}
        </Script>
        <CurrencyProvider>
          <AuthProvider>
            <RootShell>{children}</RootShell>
            <Toaster richColors position="bottom-center" />
          </AuthProvider>
        </CurrencyProvider>
      </body>
    </html>
  );
}
