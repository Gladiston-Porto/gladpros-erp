import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

// Use system fonts as fallback
const geistSans = {
  variable: "",
  className: "",
  style: {}
};
const geistMono = {
  variable: "",
  className: "",
  style: {}
};

export const metadata: Metadata = {
  title: "GladPros",
  description: "Sistema completo de gestão de clientes, propostas, projetos e financeiro",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" }
  ]
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans?.variable || ""} ${geistMono?.variable || ""} antialiased`}
        nonce={nonce}
      >
        {/* Anti-FOUC: aplica classe dark ANTES da hidratação React, evita flash branco */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gp-theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark');}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
          nonce={nonce}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}