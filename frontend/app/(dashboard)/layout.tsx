"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import CommandPalette from "../components/CommandPalette";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, isHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isHydrated, router]);

  // If not hydrated, show a full screen loader (only once on first load)
  if (!isHydrated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="skeleton-loader" />
          <p style={{ color: "var(--text-muted)", marginTop: "16px", fontSize: "14px" }}>Starting CA-OS...</p>
        </div>
      </div>
    );
  }

  // Once authenticated, render the layout immediately. 
  // If the user object is missing but we're authenticated, we wait a split second.
  if (!user && isAuthenticated) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
      <CommandPalette />
      <Sidebar user={user} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", marginLeft: "var(--sidebar-width)", minHeight: "100vh" }}>
        <TopNav user={user} />
        <main style={{ flex: 1, padding: "24px 32px", overflowY: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, Calendar, FileText, Receipt,
  Bot, MessageCircle, BarChart3, Settings, LogOut, Building2, UserCog,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clients", icon: Users, label: "Clients" },
  { href: "/compliance", icon: Calendar, label: "Compliance" },
  { href: "/staff", icon: UserCog, label: "Staff & Tasks" },
  { href: "/documents", icon: FileText, label: "Documents" },
  { href: "/billing", icon: Receipt, label: "Billing" },
  { href: "/ai", icon: Bot, label: "AI Drafts" },
  { href: "/whatsapp", icon: MessageCircle, label: "WhatsApp" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
];

function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try { await import("@/lib/api/client").then(m => m.default.post("/auth/logout")); } catch {}
    logout();
    router.replace("/login");
  };

  return (
    <aside style={{
      width: "var(--sidebar-width)", position: "fixed", top: 0, left: 0, bottom: 0,
      background: "var(--bg-secondary)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", zIndex: 50, padding: "0 12px",
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 8px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
          <div style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
            <img 
              src="/images/logo.png" 
              alt="TaxFlow AI" 
              style={{ width: "100%", height: "100%", borderRadius: 10, objectFit: "cover", position: "relative", zIndex: 2 }} 
              onError={(e) => (e.currentTarget.style.display='none')} 
            />
            <div style={{ 
              position: "absolute", inset: 0, borderRadius: 10, background: "var(--accent-green)", 
              display: "flex", alignItems: "center", justifyContent: "center", 
              fontWeight: 800, fontSize: 15, color: "white", zIndex: 1 
            }}>
              TF
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1 }}>TaxFlow AI</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Intelligent Practice</div>
          </div>
        </Link>
      </div>

      {/* Nav Links */}
      <nav style={{ flex: 1, paddingTop: 8 }}>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={`sidebar-link ${pathname.startsWith(href) ? "active" : ""}`}>
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Settings + Logout */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12, paddingBottom: 16 }}>
        <Link href="/settings" className="sidebar-link">
          <Settings size={18} />
          Settings
        </Link>
        <button onClick={handleLogout} className="sidebar-link" style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", color: "var(--accent-red)" }}>
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ── Top Nav ──────────────────────────────────────────────────────────────────
import { Search } from "lucide-react";

function TopNav({ user }: { user: any }) {
  if (!user) return <header style={{ height: "var(--topnav-height)", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }} />;

  return (
    <header style={{
      height: "var(--topnav-height)", borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 32px", background: "var(--bg-secondary)", position: "sticky", top: 0, zIndex: 40,
    }}>
      <div 
        style={{ 
          background: "var(--bg-primary)", border: "1px solid var(--border)", 
          borderRadius: "10px", padding: "8px 16px", display: "flex", alignItems: "center", 
          gap: 12, width: "300px", cursor: "pointer", color: "var(--text-muted)" 
        }}
        onClick={() => {
          window.dispatchEvent(new KeyboardEvent('keydown', { 'key': 'k', 'ctrlKey': true }));
        }}
      >
        <Search size={16} />
        <span style={{ fontSize: 13 }}>Quick Search... (Ctrl+K)</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="badge badge-green">
          <span className="status-dot status-green" style={{ marginRight: 6 }} />
          Live
        </div>
        <Link href="/settings" style={{
          width: 36, height: 36, borderRadius: "50%", background: "var(--accent-blue)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
          textDecoration: "none"
        }}>
          {user.full_name?.charAt(0) || "U"}
        </Link>
      </div>
    </header>
  );
}
