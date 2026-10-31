"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, CircleUserRound, Leaf, LogOut, Plus, type LucideIcon } from "lucide-react";
import { useAuth } from "./auth-provider";

type AppShellProps = {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  action?: React.ReactNode;
};

const navigation: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Your groups", icon: ArrowLeftRight },
  { href: "/profile", label: "Profile", icon: CircleUserRound },
];

export function AppShell({ children, title, eyebrow = "YOUR SPACE", action }: AppShellProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const initials = user?.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() ?? "";

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link className="brand-lockup" href="/dashboard" aria-label="Commonplace home">
          <span className="brand-icon"><Leaf size={20} strokeWidth={2.3} /></span>
          <span>commonplace<span className="brand-period">.</span></span>
        </Link>
        <div className="sidebar-section-label">MENU</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`nav-link ${pathname === href ? "active" : ""}`}>
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {href === "/dashboard" && <span className="nav-link-plus"><Plus size={15} /></span>}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon"><ArrowLeftRight size={16} /></span>
            <p>Good company.<br /><strong>Clear accounts.</strong></p>
          </div>
          <button className="profile-mini" onClick={logout} title="Sign out">
            <span className="avatar avatar-small avatar-green">{initials || "Y"}</span>
            <span className="profile-mini-copy"><strong>{user?.name ?? "Your account"}</strong><small>Sign out</small></span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="topbar-mobile-brand"><span className="brand-icon"><Leaf size={18} /></span> commonplace<span className="brand-period">.</span></div>
          <nav className="mobile-nav" aria-label="Main navigation">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} className={pathname === href ? "active" : ""}>
                <Icon size={18} /><span>{label}</span>
              </Link>
            ))}
          </nav>
          <div className="topbar-user"><span className="avatar avatar-small avatar-coral">{initials || "Y"}</span><span>{user?.name}</span></div>
        </header>
        <main className="workspace">
          <div className="page-heading">
            <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>
            {action && <div className="page-heading-action">{action}</div>}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Getting things in order…" }: { label?: string }) {
  return <div className="loading-state"><span className="loading-mark"><Leaf size={18} /></span><span>{label}</span></div>;
}

export function ErrorNotice({ message }: { message: string }) {
  return <div role="alert" className="notice notice-error">{message}</div>;
}

export function EmptyState({ title, message, action }: { title: string; message: string; action?: React.ReactNode }) {
  return <div className="empty-state"><span className="empty-mark"><ArrowLeftRight size={22} /></span><h3>{title}</h3><p>{message}</p>{action}</div>;
}