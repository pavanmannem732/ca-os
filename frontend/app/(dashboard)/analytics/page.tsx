"use client";
import { useState, useEffect } from "react";
import { 
  BarChart3, TrendingUp, Users, 
  CheckCircle2, Clock, Zap, 
  ArrowUpRight, Target, Activity,
  Download, Filter, ShieldAlert,
  Calendar, DollarSign, UserCheck,
  ChevronRight, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api/client";

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [revenueTrend, setRevenueTrend] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [statsRes, trendRes] = await Promise.all([
        api.get("/insight-engine/stats"),
        api.get("/insight-engine/revenue-trend")
      ]);
      setStats(statsRes.data);
      setRevenueTrend(trendRes.data);
    } catch (err) {
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, trendRes] = await Promise.all([
        api.get("/insight-engine/stats"),
        api.get("/insight-engine/revenue-trend")
      ]);
      setStats(statsRes.data);
      setRevenueTrend(trendRes.data);
      toast.success("Intelligence data synchronized!");
    } catch (err) {
      toast.error("Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  if (loading || !stats) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
        <div style={{ textAlign: "center" }}>
          <RefreshCw className="animate-spin" size={40} style={{ color: "var(--accent-blue)", marginBottom: "16px" }} />
          <p style={{ color: "var(--text-secondary)" }}>Engaging Insight Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "32px", minHeight: "100%", background: "var(--bg-primary)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: "4px" }}>Insight Engine</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Firm-wide performance metrics, revenue intelligence, and staff analytics.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button 
            className={`btn btn-ghost ${isRefreshing ? "is-loading" : ""}`} 
            style={{ border: "1px solid var(--border-subtle)", gap: "8px" }} 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            {!isRefreshing && <RefreshCw size={18} />} Sync Intelligence
          </button>
          <button className="btn btn-ghost" style={{ border: "1px solid var(--border-subtle)", gap: "8px" }} onClick={() => window.print()}>
            <Download size={18} /> Export PDF
          </button>
        </div>
      </div>

      {/* Hero Analytics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", marginBottom: "32px" }}>
        {/* Compliance Health */}
        <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "var(--accent-blue)10", borderRadius: "0 0 0 100%", zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-blue)15", color: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={20} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-green)" }}>+2.4%</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>{stats.compliance_health}/10</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Compliance Health Index</div>
          </div>
        </div>

        {/* AI Efficiency */}
        <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "var(--accent-purple)10", borderRadius: "0 0 0 100%", zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-purple)15", color: "var(--accent-purple)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={20} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-purple)" }}>AI ACTIVE</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>{stats.ai_savings.hours_saved} hrs</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Time Saved (MTD)</div>
          </div>
        </div>

        {/* Recovery Rate */}
        <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "var(--accent-green)10", borderRadius: "0 0 0 100%", zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-green)15", color: "var(--accent-green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={20} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-green)" }}>{stats.revenue.recovery_rate}%</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>₹{(stats.revenue.total_billed / 100000).toFixed(1)} L</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Billed Revenue (MTD)</div>
          </div>
        </div>

        {/* Staff Utilization */}
        <div className="card" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: "100px", height: "100px", background: "var(--accent-orange)10", borderRadius: "0 0 0 100%", zIndex: 0 }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-orange)15", color: "var(--accent-orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserCheck size={20} />
              </div>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-orange)" }}>OPTIMAL</span>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 800 }}>88%</div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Team Utilization</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Revenue Trend Chart */}
        <div className="card" style={{ padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Revenue Growth & Forecasting</h3>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px", fontWeight: 600 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--accent-blue)" }} /> Actual</div>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}><div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "var(--accent-blue)30" }} /> Projected</div>
            </div>
          </div>
          <div style={{ height: "240px", display: "flex", alignItems: "flex-end", gap: "16px", paddingBottom: "32px", position: "relative" }}>
            {revenueTrend.map((item: any, i: number) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "100%", display: "flex", flexDirection: "column-reverse", gap: "4px" }}>
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.amount / 1500000) * 100}%` }}
                    style={{ background: "var(--accent-blue)", width: "100%", borderRadius: "4px" }}
                  />
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)" }}>{item.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Performance */}
        <div className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px" }}>Top Staff Performance</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {stats.staff_performance.length > 0 ? stats.staff_performance.map((staff: any, i: number) => (
              <div key={i}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "13px" }}>
                  <span style={{ fontWeight: 600 }}>{staff.name}</span>
                  <span style={{ color: "var(--text-secondary)" }}>{staff.tasks} tasks completed</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--bg-secondary)", borderRadius: "4px", overflow: "hidden" }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(staff.tasks / 50) * 100}%` }}
                    style={{ height: "100%", background: "linear-gradient(90deg, var(--accent-blue), var(--accent-purple))", borderRadius: "4px" }}
                  />
                </div>
              </div>
            )) : (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <Users size={40} style={{ opacity: 0.1, marginBottom: "12px" }} />
                <p>No staff activity recorded this month.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px" }}>
        {/* Compliance Distribution (Circular) */}
        <div className="card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>Compliance Mix</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "GST Returns", value: 45, color: "var(--accent-blue)" },
              { label: "Income Tax", value: 30, color: "var(--accent-purple)" },
              { label: "ROC Filings", value: 15, color: "var(--accent-green)" },
              { label: "Audit/Other", value: 10, color: "var(--accent-orange)" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", background: item.color }} />
                <span style={{ flex: 1, fontSize: "13px", fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: "13px", fontWeight: 700 }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Savings Breakdown */}
        <div className="card" style={{ padding: "24px", background: "linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>AI Leverage Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Drafts Adopted</div>
              <div style={{ fontSize: "20px", fontWeight: 800 }}>{stats.ai_savings.drafts_used}</div>
            </div>
            <div style={{ background: "white", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>Manual Work Replaced</div>
              <div style={{ fontSize: "20px", fontWeight: 800 }}>74%</div>
            </div>
          </div>
        </div>

        {/* Quick Actions / Alerts */}
        <div className="card" style={{ padding: "24px", border: "1px solid var(--accent-red)20" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "var(--accent-red)", display: "flex", alignItems: "center", gap: "8px" }}>
            <ShieldAlert size={18} /> Critical Alerts
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ padding: "12px", borderRadius: "10px", background: "var(--accent-red)05", border: "1px solid var(--accent-red)10", fontSize: "13px" }}>
              <div style={{ fontWeight: 700, color: "var(--accent-red)", marginBottom: "2px" }}>Billing Leakage Detected</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>12 tasks completed but not yet billed to clients.</p>
            </div>
            <div style={{ padding: "12px", borderRadius: "10px", background: "var(--accent-orange)05", border: "1px solid var(--accent-orange)10", fontSize: "13px" }}>
              <div style={{ fontWeight: 700, color: "var(--accent-orange)", marginBottom: "2px" }}>Compliance Drift</div>
              <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>TechCorp health score dropped by 1.5 points.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
