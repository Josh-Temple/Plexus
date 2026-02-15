import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plexus",
  description: "Zettelkasten-focused PKM for mobile",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col">{children}</main>
      </body>
    </html>
  );
}
