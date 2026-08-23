"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/authStore";
import Link from "next/link";

export default function LandingPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* ── Navbar ── */}
      <nav style={{ borderBottom: "1px solid var(--border)", padding: "0 48px", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16 }}>CA</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>CA-OS</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/login" className="btn btn-ghost" style={{ textDecoration: "none" }}>Sign In</Link>
          <Link href="/login" className="btn btn-primary" style={{ textDecoration: "none" }}>Start Free Trial</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", textAlign: "center" }}>
        <div className="badge badge-blue" style={{ marginBottom: 24, padding: "6px 16px", fontSize: 13 }}>✦ Built for Indian CA Firms</div>
        <h1 style={{ fontSize: "clamp(36px, 6vw, 72px)", fontWeight: 800, lineHeight: 1.1, maxWidth: 800, marginBottom: 24, background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Run Your Entire CA Practice From One Intelligent Platform
        </h1>
        <p style={{ fontSize: 18, color: "var(--text-secondary)", maxWidth: 600, marginBottom: 48, lineHeight: 1.7 }}>
          Compliance calendar, client management, AI-powered drafts, WhatsApp automation, and billing — all unified for Indian CA firms.
        </p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/login" className="btn btn-primary" style={{ textDecoration: "none", padding: "14px 32px", fontSize: 16 }}>
            Get Started Free →
          </Link>
          <a href="#features" className="btn btn-ghost" style={{ padding: "14px 32px", fontSize: 16 }}>
            See Features
          </a>
        </div>
      </section>

      {/* ── Feature Grid ── */}
      <section id="features" style={{ padding: "80px 48px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
        <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Everything your CA firm needs</h2>
        <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: 64, fontSize: 16 }}>One platform to replace 7 disconnected tools</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
          {[
            { icon: "📅", title: "Smart Compliance Calendar", desc: "Auto-generates all GST, TDS, and ITR deadlines for every client. Never miss a filing date." },
            { icon: "🤖", title: "AI Draft Generator", desc: "Generate GST notice responses, engagement letters, and more using Claude AI — in seconds." },
            { icon: "💬", title: "WhatsApp Automation", desc: "Automated document collection, deadline reminders, and client communication via WhatsApp." },
            { icon: "📁", title: "Document Management", desc: "Centralized document storage with OCR extraction, virus scanning, and S3-backed security." },
            { icon: "💰", title: "Billing & Invoicing", desc: "Time tracking, invoice generation with Razorpay payment links, and revenue analytics." },
            { icon: "🏥", title: "Client Health Scoring", desc: "AI-powered compliance health scores, churn risk detection, and billing opportunity alerts." },
          ].map((f) => (
            <div key={f.title} className="card metric-card" style={{ padding: "28px", cursor: "default" }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: "24px 48px", borderTop: "1px solid var(--border)", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        © 2025 CA-OS. Built for Indian Chartered Accountants.
      </footer>
    </main>
  );
}
