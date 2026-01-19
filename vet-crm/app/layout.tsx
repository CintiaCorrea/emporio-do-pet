"use client";

import { SessionProvider } from "next-auth/react";
import "@/styles/globals.css";
import { ThemeProvider } from "@/components/common/ThemeProvider";
import { ThemeScript } from "@/components/common/ThemeScript";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
