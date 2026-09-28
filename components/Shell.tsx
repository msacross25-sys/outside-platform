import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";

const nav = [
  ["Home", "/"], ["Discover", "/discover"], ["Live", "/live"],
  ["The Porch", "/porch"], ["Circles", "/circles"], ["Receipts", "/receipts"],
  ["Messages", "/messages"], ["Creator Studio", "/studio"]
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <BrandMark/>
        <p className="tagline">Come OUTSiiDE.</p>
        <nav>{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <Link className="create" href="/create">+ Create</Link>
      </aside>
      <main>{children}</main>
      <aside className="rail">
        <strong>Happening OUTSiiDE</strong>
        <p>Live rooms, Porch conversations, Circles and rising creators will appear here.</p>
      </aside>
    </div>
  );
}
