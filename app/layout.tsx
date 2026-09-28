import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OUTSiiDE",
  description: "Come OUTSiiDE — watch, create, talk, and belong."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
