"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import api from "@/lib/api/client";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { 
  Calendar, FileText, AlertTriangle, TrendingUp, 
  CheckCircle, Clock, Users, Bot, Zap, ArrowUpRight 
} from "lucide-react";
import Link from "next/link";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

interface DashboardData {
  deadlines_today: number;
  overdue_tasks: number;
  pending_documents: number;
  tasks_this_week: any[];
  staff_workload: any[];
  ai_activity: any[];
}

function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ 
        position: "fixed", inset: 0, background: "rgba(10, 15, 30, 0.9)", 
        backdropFilter: "blur(10px)", zIndex: 1000, display: "flex", 
        alignItems: "center", justifyContent: "center", padding: 24 
      }}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="card" 
        style={{ maxWidth: 500, padding: 48, textAlign: "center", background: "var(--bg-card)", border: "1px solid var(--accent-blue)30" }}
      >
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--accent-blue)20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
          <Zap size={40} color="var(--accent-blue)" />
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16, letterSpacing: "-0.04em" }}>Welcome to CA-OS</h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
          Your AI-powered tax practice is ready. Let's take a quick 1-minute tour to see how your new agents can handle the heavy lifting.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
           <button onClick={onComplete} className="btn btn-primary" style={{ height: 56, fontSize: 16, borderRadius: 14 }}>
             Start Guided Tour
           </button>
           <button onClick={onComplete} className="btn btn-ghost" style={{ border: "none" }}>
             Skip for now
           </button>
        </div>
      </motion.div>
      
      {/* Celebration Particles */}
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ top: "50%", left: "50%", opacity: 1, scale: 0 }}
          animate={{ 
            top: `${Math.random() * 100}%`, 
            left: `${Math.random() * 100}%`, 
            opacity: 0, 
            scale: Math.random() * 2 
          }}
          transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
          style={{ 
            position: "absolute", width: 8, height: 8, borderRadius: "50%", 
            background: i % 2 === 0 ? "var(--accent-blue)" : "var(--accent-purple)", 
            pointerEvents: "none" 
          }}
        />
      ))}
    </motion.div>
  );
}

function MetricCard({ label, value, icon: Icon, colorClass, trend, href }: any) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <motion.div
        className={`card metric-card ${colorClass}`}
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ duration: 0.15 }}
        style={{ cursor: "pointer", height: "100%" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 40, fontWeight: 800, lineHeight: 1 }}>{value}</p>
            {trend && <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>{trend}</p>}
          </div>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={22} style={{ color: "var(--text-secondary)" }} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user, completeOnboarding } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [tasksRes, staffRes] = await Promise.all([
          api.get("/compliance/tasks?filter[status]=overdue&limit=5"),
          api.get("/staff")
        ]);

        // Mocking some data for the charts as per Section 41.2 requirements
        const staffWorkload = (staffRes.data.data || []).map((s: any) => ({
          name: s.full_name.split(" ")[0],
          workload: Math.floor(Math.random() * 80) + 20, // Simulated weighted workload
        })).slice(0, 5);

        const aiActivity = [
          { name: 'Approved', value: 45, color: 'var(--accent-green)' },
          { name: 'Drafted', value: 25, color: 'var(--accent-blue)' },
          { name: 'Refined', value: 15, color: 'var(--accent-purple)' },
        ];

        setData({
          deadlines_today: tasksRes.data.data?.length || 0,
          overdue_tasks: tasksRes.data.data?.length || 0,
          pending_documents: 3, // Mock
          tasks_this_week: tasksRes.data.data || [],
          staff_workload: staffWorkload,
          ai_activity: aiActivity
        });
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const greeting = new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-in" style={{ maxWidth: "1400px", margin: "0 auto" }}>
      <AnimatePresence>
        {user && !user.has_completed_onboarding && (
          <OnboardingOverlay onComplete={() => {
            completeOnboarding();
            toast.success("Welcome aboard! Your practice is now AI-enabled.");
          }} />
        )}
      </AnimatePresence>

      {/* ── Hero Banner ── */}
      <div style={{ 
        position: "relative", height: "160px", borderRadius: "24px", overflow: "hidden", marginBottom: "32px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        border: "1px solid var(--border)"
      }}>
        <div style={{ 
          position: "absolute", inset: 0, padding: "0 40px", display: "flex", flexDirection: "column", justifyContent: "center",
          background: "radial-gradient(circle at top right, rgba(59,130,246,0.15), transparent 40%)"
        }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "white", marginBottom: 8, letterSpacing: "-0.02em" }}>
            {greeting}, {user?.full_name?.split(" ")[0] || "CA"} 👋
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 16, fontWeight: 500 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} • Practice Health: <span style={{ color: "var(--accent-green)" }}>Excellent</span>
          </p>
        </div>
        <div style={{ position: "absolute", right: 40, top: "50%", transform: "translateY(-50%)", display: "flex", gap: 12 }}>
           <button className="btn btn-primary" style={{ height: "44px", borderRadius: "12px", background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
             <Zap size={16} /> Quick Action
           </button>
        </div>
      </div>

      {/* ── Metric Cards Grid (2x2 as per Section 41.2) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 32 }}>
        <MetricCard label="Compliance Deadlines" value={data?.deadlines_today ?? 0} icon={Calendar} colorClass="metric-card-blue" trend="Due today across all clients" href="/compliance" />
        <MetricCard label="Overdue Tasks" value={data?.overdue_tasks ?? 0} icon={AlertTriangle} colorClass="metric-card-red" trend="Requires immediate intervention" href="/compliance?status=overdue" />
        <MetricCard label="Documents Pending" value={data?.pending_documents ?? 0} icon={FileText} colorClass="metric-card-amber" trend="Awaiting client submission" href="/documents" />
        <MetricCard label="Staff Efficiency" value="94%" icon={Users} colorClass="metric-card-green" trend="+2.4% from last week" href="/staff" />
      </div>

      {/* ── Third Row: Side-by-Side Panels (Section 41.2) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 32 }}>
        
        {/* Staff Workload Intelligence */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
               <Users size={18} color="var(--accent-blue)" /> Staff Workload Intelligence
            </h2>
            <Link href="/staff" className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 12px" }}>Manage Team</Link>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.staff_workload || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="workload" radius={[4, 4, 0, 0]}>
                  {data?.staff_workload?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.workload > 70 ? 'var(--accent-red)' : entry.workload > 40 ? 'var(--accent-amber)' : 'var(--accent-blue)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Agent Activity */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
            <Bot size={18} color="var(--accent-purple)" /> AI Activity
          </h2>
          <div style={{ height: 180, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.ai_activity || []}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data?.ai_activity?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
               <div style={{ fontSize: 24, fontWeight: 800 }}>85</div>
               <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Drafts</div>
            </div>
          </div>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
             {data?.ai_activity?.map(item => (
               <div key={item.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color }} />
                    <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                  </div>
                  <span style={{ fontWeight: 600 }}>{item.value}%</span>
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row: Billing Panel (Section 41.2) ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={18} color="var(--accent-green)" /> Financial Overview & Billing
          </h2>
          <div style={{ display: "flex", gap: 12 }}>
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>OUTSTANDING</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-red)" }}>₹4,25,000</div>
             </div>
             <div style={{ width: 1, background: "var(--border)", margin: "0 8px" }} />
             <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>COLLECTED (MAY)</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--accent-green)" }}>₹12,80,000</div>
             </div>
          </div>
        </div>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
           {[
             { label: "Pending Invoices", value: "12", sub: "₹85,400 overdue", color: "amber" },
             { label: "AI Upsell Revenue", value: "₹18,200", sub: "From technical queries", color: "purple" },
             { label: "Automation Savings", value: "₹45,000", sub: "Staff hours saved", color: "green" },
           ].map(item => (
             <div key={item.label} style={{ padding: 20, background: "var(--bg-secondary)", borderRadius: "16px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600, marginBottom: 8 }}>{item.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{item.value}</div>
                <div style={{ fontSize: 12, color: `var(--accent-${item.color})`, display: "flex", alignItems: "center", gap: 4 }}>
                   <ArrowUpRight size={14} /> {item.sub}
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
