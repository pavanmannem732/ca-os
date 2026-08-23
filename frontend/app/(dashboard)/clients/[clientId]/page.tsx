"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Building2, Phone, Mail, Shield, FileText,
  Receipt, MessageCircle, CheckCircle2, AlertCircle,
  Clock, Star, Edit3, ExternalLink, ChevronRight,
  ShieldCheck, TrendingUp, Zap, Calendar, User,
  File, Download, MoreVertical, Trash2, PieChart as PieIcon,
  BarChart3, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api/client";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

const TABS = ["Overview", "Compliance", "Documents", "Billing", "Insights"] as const;
type Tab = typeof TABS[number];

const CLIENT_TYPE_LABELS: Record<string, string> = {
  company_private: "Private Limited",
  company_public: "Public Limited",
  llp: "LLP",
  partnership_firm: "Partnership",
  proprietorship: "Proprietorship",
  individual: "Individual",
  huf: "HUF",
  trust: "Trust / Society",
};

const MOCK_ENGAGEMENT_DATA = [
  { month: 'Jan', engagement: 65, responsiveness: 70 },
  { month: 'Feb', engagement: 58, responsiveness: 62 },
  { month: 'Mar', engagement: 75, responsiveness: 80 },
  { month: 'Apr', engagement: 82, responsiveness: 85 },
  { month: 'May', engagement: 90, responsiveness: 95 },
];

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.clientId as string;

  const [client, setClient] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  useEffect(() => {
    if (clientId) fetchAll();
  }, [clientId]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [clientRes, taskRes, invoiceRes, docRes] = await Promise.allSettled([
        api.get(`/clients/${clientId}`),
        api.get("/compliance/tasks", { params: { client_id: clientId } }),
        api.get("/billing/invoices", { params: { client_id: clientId } }),
        api.get("/documents", { params: { client_id: clientId } }),
      ]);
      if (clientRes.status === "fulfilled") setClient(clientRes.value.data.data);
      if (taskRes.status === "fulfilled") setTasks(taskRes.value.data.data || []);
      if (invoiceRes.status === "fulfilled") setInvoices(invoiceRes.value.data.data || []);
      if (docRes.status === "fulfilled") setDocuments(docRes.value.data.data || []);
    } catch {
      toast.error("Failed to load client details");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCalendar = async () => {
    setLoading(true);
    try {
      await api.post(`/compliance/generate-calendar/${clientId}`);
      toast.success("Annual compliance calendar generated successfully!");
      fetchAll(); // Refresh tasks
    } catch {
      toast.error("Failed to generate calendar");
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) =>
    score >= 8 ? "var(--accent-green)" : score >= 5 ? "var(--accent-amber)" : "var(--accent-red)";

  if (loading) {
    return (
      <div style={{ padding: "32px" }}>
        <div className="skeleton" style={{ height: "32px", width: "200px", marginBottom: "32px" }} />
        <div className="skeleton" style={{ height: "160px", borderRadius: "16px", marginBottom: "24px" }} />
      </div>
    );
  }

  if (!client) return <div>Client not found</div>;

  return (
    <div style={{ padding: "32px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* ── Back Navigation ── */}
      <button onClick={() => router.push("/clients")}
        style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "14px", background: "none", border: "none", cursor: "pointer", marginBottom: "32px" }}>
        <ArrowLeft size={16} /> Back to Clients List
      </button>

      {/* ── Hero Header (Section 31.4) ── */}
      <div className="card" style={{ padding: "32px", marginBottom: "32px", position: "relative", overflow: "hidden", background: "var(--bg-secondary)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "4px", background: "linear-gradient(90deg, var(--accent-blue), var(--accent-purple), var(--accent-green))" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <div style={{
              width: "72px", height: "72px", borderRadius: "20px",
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontWeight: 900, fontSize: "28px", flexShrink: 0,
              boxShadow: "0 10px 20px rgba(59, 130, 246, 0.2)"
            }}>
              {client.name?.charAt(0)}
            </div>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: 800, marginBottom: "6px", letterSpacing: "-0.03em" }}>{client.name}</h1>
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span className="badge badge-blue">{CLIENT_TYPE_LABELS[client.client_type] || client.client_type}</span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>ID: {clientId.slice(0, 8).toUpperCase()}</span>
                {client.is_active ? <span className="badge badge-green">Active</span> : <span className="badge badge-red">Inactive</span>}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn btn-ghost" style={{ borderRadius: "12px" }}><Edit3 size={16} /> Edit Client</button>
            <button className="btn btn-primary" style={{ borderRadius: "12px", background: "var(--accent-purple)" }}><Zap size={16} /> AI Insight</button>
          </div>
        </div>

        {/* Health Metrics Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginTop: "32px" }}>
           {[
             { label: "Compliance Health", value: `${client.compliance_health_score}/10`, color: scoreColor(client.compliance_health_score), icon: ShieldCheck },
             { label: "Document Status", value: "Ready", color: "var(--accent-green)", icon: FileText },
             { label: "Engagement Level", value: "High", color: "var(--accent-blue)", icon: Activity },
           ].map(metric => (
             <div key={metric.label} style={{ padding: "16px 20px", background: "var(--bg-primary)", borderRadius: "16px", border: "1px solid var(--border)", display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${metric.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                   <metric.icon size={20} style={{ color: metric.color }} />
                </div>
                <div>
                   <div style={{ fontSize: 20, fontWeight: 800, color: metric.color }}>{metric.value}</div>
                   <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{metric.label}</div>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--border)", marginBottom: "32px", paddingBottom: "2px" }}>
        {TABS.map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "12px 24px", borderRadius: "12px 12px 0 0", border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: "14px", transition: "all 0.2s",
              background: activeTab === tab ? "rgba(59, 130, 246, 0.1)" : "transparent",
              color: activeTab === tab ? "var(--accent-blue)" : "var(--text-secondary)",
              position: "relative"
            }}
          >
            {tab}
            {activeTab === tab && <div style={{ position: "absolute", bottom: -2, left: 0, right: 0, height: 3, background: "var(--accent-blue)", borderRadius: "3px 3px 0 0" }} />}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={activeTab} 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }} 
          transition={{ duration: 0.2 }}
        >
          {activeTab === "Overview" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
               {/* Left: General Info */}
               <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Contact Details</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                     <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><User size={18} color="var(--text-muted)" /></div>
                        <div>
                           <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>PRIMARY CONTACT</div>
                           <div style={{ fontWeight: 600 }}>{client.primary_contact_name}</div>
                        </div>
                     </div>
                     <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Phone size={18} color="var(--text-muted)" /></div>
                        <div>
                           <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>MOBILE</div>
                           <div style={{ fontWeight: 600 }}>{client.primary_mobile}</div>
                        </div>
                     </div>
                     <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Mail size={18} color="var(--text-muted)" /></div>
                        <div>
                           <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>EMAIL</div>
                           <div style={{ fontWeight: 600 }}>{client.primary_email || "N/A"}</div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Right: Tax Profile */}
               <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Tax Identifiers</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                     {['gstin', 'pan', 'tan', 'cin'].map(id => (
                       <div key={id} style={{ padding: 16, background: "var(--bg-secondary)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{id}</div>
                          <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", marginTop: 4 }}>{client[id] || "—"}</div>
                       </div>
                     ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === "Compliance" && (
            <div className="card" style={{ overflow: "hidden" }}>
               <table className="table">
                  <thead>
                     <tr>
                        <th>Compliance Task</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Reminders</th>
                        <th>Actions</th>
                     </tr>
                  </thead>
                  <tbody>
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={5} style={{ padding: "60px", textAlign: "center" }}>
                            <Calendar size={48} style={{ margin: "0 auto 16px", opacity: 0.1 }} />
                            <h4 style={{ fontWeight: 700, marginBottom: 8 }}>No Compliance Data Set</h4>
                            <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 24 }}>
                              CA-OS hasn't generated the compliance roadmap for this client yet.
                            </p>
                            <button 
                              onClick={handleGenerateCalendar}
                              className="btn btn-primary" 
                              style={{ gap: 8, background: "var(--accent-purple)" }}
                            >
                              <Zap size={16} /> Setup Compliance Calendar
                            </button>
                          </td>
                        </tr>
                      ) : (
                        tasks.map((t: any) => (
                          <tr key={t.id}>
                             <td>
                                <div style={{ fontWeight: 700 }}>{t.task_type.replace(/_/g, " ").toUpperCase()}</div>
                                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Period: May 2026</div>
                             </td>
                             <td>
                                <span className={`badge ${t.status === 'completed' ? 'badge-green' : 'badge-amber'}`}>
                                   {t.status}
                                </span>
                             </td>
                             <td style={{ fontSize: 13, fontWeight: 500 }}>{t.due_date}</td>
                             <td>
                                <div style={{ display: "flex", gap: 4, alignItems: "center", color: "var(--text-muted)", fontSize: 12 }}>
                                   <MessageCircle size={14} /> {t.reminder_sent_count || 0} sent
                                </div>
                             </td>
                             <td>
                                <button className="btn btn-ghost" style={{ padding: "4px 8px" }}><MoreVertical size={16} /></button>
                             </td>
                          </tr>
                        ))
                      )}
                   </tbody>
               </table>
            </div>
          )}

          {activeTab === "Documents" && (
            <div className="card" style={{ padding: 24 }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                  <h3 style={{ fontWeight: 700 }}>Document Vault</h3>
                  <button className="btn btn-primary" style={{ gap: 8 }}><Download size={16} /> Bulk Download</button>
               </div>
               <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
                  {documents.length === 0 ? (
                    <div style={{ gridColumn: "1 / -1", padding: "60px", textAlign: "center", background: "var(--bg-secondary)", borderRadius: 16 }}>
                       <File size={48} style={{ margin: "0 auto 16px", opacity: 0.1 }} />
                       <p style={{ color: "var(--text-muted)" }}>No documents uploaded for this client.</p>
                       <button className="btn btn-primary" style={{ marginTop: 20 }}>Upload Now</button>
                    </div>
                  ) : documents.map(doc => (
                    <div key={doc.id} className="card" style={{ padding: 16, background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}>
                       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                             <File size={20} color="var(--accent-blue)" />
                          </div>
                          <button style={{ background: "none", border: "none", color: "var(--text-muted)" }}><MoreVertical size={16} /></button>
                       </div>
                       <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.file_name}</div>
                       <div style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                          <span>{(doc.file_size_bytes / 1024).toFixed(1)} KB</span>
                          <span>{doc.ocr_status === 'completed' ? 'AI Ready' : 'Processing'}</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === "Insights" && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
               {/* Engagement Trends */}
               <div className="card" style={{ padding: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                     <BarChart3 size={18} color="var(--accent-blue)" /> Client Engagement Trend
                  </h3>
                  <div style={{ height: 300 }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={MOCK_ENGAGEMENT_DATA}>
                           <defs>
                              <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                           <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                           <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                           <Tooltip contentStyle={{background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8}} />
                           <Area type="monotone" dataKey="engagement" stroke="var(--accent-blue)" fillOpacity={1} fill="url(#colorEng)" strokeWidth={3} />
                           <Area type="monotone" dataKey="responsiveness" stroke="var(--accent-green)" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Churn Risk Prediction (Section 31.4) */}
               <div className="card" style={{ padding: 24, background: "linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                     <ShieldCheck size={18} color="var(--accent-green)" /> Retention AI
                  </h3>
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                     <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 20px" }}>
                        <svg width="120" height="120" viewBox="0 0 120 120">
                           <circle cx="60" cy="60" r="54" fill="none" stroke="var(--border)" strokeWidth="8" />
                           <circle cx="60" cy="60" r="54" fill="none" stroke="var(--accent-green)" strokeWidth="8" strokeDasharray="339.292" strokeDashoffset={339.292 * (1 - 0.85)} strokeLinecap="round" transform="rotate(-90 60 60)" />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                           <div style={{ fontSize: 28, fontWeight: 900 }}>85%</div>
                           <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)" }}>RETAINED</div>
                        </div>
                     </div>
                     <div className="badge badge-green" style={{ marginBottom: 12 }}>Low Churn Risk</div>
                     <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>Client has fulfilled all document requests on time for 5 consecutive months.</p>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 20 }}>
                     <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase" }}>Key Signals</div>
                     <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                           <span>Responsiveness</span>
                           <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>Excellent</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                           <span>Billing Regularity</span>
                           <span style={{ color: "var(--accent-green)", fontWeight: 700 }}>100% Paid</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                           <span>Last Interaction</span>
                           <span style={{ color: "var(--accent-blue)", fontWeight: 700 }}>2h ago</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === "Billing" && (
            <div className="card">
               <table className="table">
                  <thead>
                     <tr>
                        <th>Invoice #</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Due Date</th>
                        <th>Payment</th>
                     </tr>
                  </thead>
                  <tbody>
                     {invoices.map(inv => (
                        <tr key={inv.id}>
                           <td style={{ fontFamily: "monospace", fontWeight: 600 }}>{inv.invoice_number}</td>
                           <td style={{ fontWeight: 800 }}>₹{inv.total_amount?.toLocaleString()}</td>
                           <td><span className={`badge ${inv.status === 'paid' ? 'badge-green' : 'badge-amber'}`}>{inv.status}</span></td>
                           <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{inv.due_date}</td>
                           <td>
                              <button className="btn btn-ghost" style={{ fontSize: 12, gap: 6 }}>
                                 <ExternalLink size={14} /> Link
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
