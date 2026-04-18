import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import NavMenu from "@/components/NavMenu";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CodorGest - Quail Manager",
  description: "Sistema avanzado de gestión de cría de codornices",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={inter.className}>
      <body>
        <div className="app-layout">
          <header className="app-header">
            <div className="logo-container">
              <span className="logo-icon">🐣</span>
              <h1>CodorGest</h1>
            </div>
            <NavMenu />
          </header>
          <main className="app-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
