import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/BrandMark";
import { currentUser } from "@/lib/session";

const nav = [
  ["Home", "/"], ["Discover", "/discover"], ["Live", "/live"],
  ["The Porch", "/porch"], ["Circles", "/circles"], ["Receipts", "/receipts"],
  ["Messages", "/messages"], ["Notifications", "/notifications"], ["Wallet", "/wallet"], ["Creator Studio", "/studio"], ["Host Center", "/host/apply"]
];

export async function Shell({ children }: { children: ReactNode }) {
  const me = await currentUser();
  return (
    <div className="shell">
      <aside className="sidebar">
        <BrandMark/>
        <p className="tagline">Come OUTSiiDE.</p>
        <nav>{nav.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</nav>
        <Link className="create" href="/create">+ Create</Link>
        {me && (
          <div className="accountNav">
            <Link href={"/u/" + me.username}>Profile · @{me.username}</Link>
            <Link href="/settings/profile">Settings</Link>
            <form action="/api/auth/logout" method="post"><button type="submit">Log out</button></form>
          </div>
        )}
      </aside>
      <main>{children}</main>
      <aside className="rail">
        <strong>Happening OUTSiiDE</strong>
        <p>Live rooms, Porch conversations, Circles and rising creators will appear here.</p>
      </aside>
    </div>
  );
}
