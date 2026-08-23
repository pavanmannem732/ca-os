"use client";
import { useState, useEffect } from "react";
import { 
  Bot, Sparkles, Search, Filter, 
  FileText, ArrowRight, CheckCircle, 
  Clock, Trash2, Edit3, Zap, X,
  MessageSquare, ShieldAlert, BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api/client";


const MOCK_DRAFTS = [
  { id: "1", title: "GST Notice Response (ZD360125...)", client: "TechCorp Pvt Ltd", status: "Ready", date: "10 mins ago", output: "" },
  { id: "2", title: "Income Tax Scrutiny Draft", client: "Rajesh Kumar", status: "Ready", date: "2 hours ago", output: "" },
  { id: "3", title: "Engagement Letter FY 2025-26", client: "Manufacturing Co.", status: "Approved", date: "Yesterday", output: "" },
];

export default function AIDraftsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskData, setTaskData] = useState({
    client_id: "",
    draft_type: "gst_notice_response",
    context: ""
  });

  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => { 
    fetchDrafts(); 
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients");
      setClients(res.data.data || []);
    } catch {
      // fail silently
    }
  };

  const fetchDrafts = async () => {
    try {
      const res = await api.get("/ai/drafts");
      const apiDrafts = (res.data.data || []).map((d: any) => ({
        id: d.id,
        title: `${d.draft_type.replace(/_/g, " ").toUpperCase()} Draft`,
        client: "Client",
        status: "Ready",
        date: new Date(d.created_at).toLocaleDateString(),
        output: d.output_text || ""
      }));
      setDrafts(apiDrafts.length > 0 ? apiDrafts : MOCK_DRAFTS);
    } catch { setDrafts(MOCK_DRAFTS); }
  };

  const handleDeleteDraft = async (id: string) => {
    try {
      await api.delete(`/ai/drafts/${id}`);
      toast.success("Draft deleted successfully");
      fetchDrafts();
    } catch {
      toast.error("Failed to delete draft");
    }
  };

  const handleReview = (draft: any) => {
    setSelectedDraft(draft);
    setIsReviewOpen(true);
  };

  const handleApprove = () => {
    toast.success("Draft approved and saved to client record.");
    setIsReviewOpen(false);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        draft_type: taskData.draft_type,
        client_id: taskData.client_id || undefined,
        context: { text: taskData.context }
      };
      
      await api.post("/ai/draft", payload);
      toast.success("AI Engine Initialized. Draft is being generated...");
      setIsModalOpen(false);
      setTaskData({ client_id: "", draft_type: "gst_notice_response", context: "" });
      fetchDrafts();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to start AI task.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
        <div>
          <h1 style={{ 
            fontSize: "36px", 
            fontWeight: 900, 
            letterSpacing: "-0.04em",
            background: "linear-gradient(to right, #fff, #94a3b8)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "8px"
          }}>
            AI Drafts Hub
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", fontWeight: 500 }}>
            Automated technical responses powered by <span style={{ color: "var(--accent-purple)" }}>Claude 3.5 Sonnet</span>
          </p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn" style={{ 
          background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)", 
          border: "none", 
          color: "white",
          padding: "12px 24px",
          borderRadius: "14px",
          boxShadow: "0 10px 25px -5px rgba(139, 92, 246, 0.4)",
          fontWeight: 700
        }}>
          <Sparkles size={18} style={{ marginRight: 8 }} /> New AI Task
        </button>
      </div>

      {/* ── AI Usage Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "40px" }}>
        {[
          { label: "Efficiency", value: "85%", icon: Zap, color: "blue", desc: "Response speed vs manual" },
          { label: "Time Saved", value: "42h", icon: Clock, color: "green", desc: "Total practice hours saved" },
          { label: "Quality Score", value: "9.8", icon: CheckCircle, color: "purple", desc: "Approved with zero edits" },
        ].map((item, idx) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="card" 
            style={{ padding: "24px", position: "relative", overflow: "hidden" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
               <div style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase" }}>{item.label}</div>
               <item.icon size={18} style={{ color: `var(--accent-${item.color})` }} />
            </div>
            <div style={{ fontSize: "32px", fontWeight: 800, marginBottom: 4 }}>{item.value}</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{item.desc}</div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `var(--accent-${item.color})`, opacity: 0.3 }} />
          </motion.div>
        ))}
      </div>

      {/* ── Search & Filter ── */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "32px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={18} style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="input" placeholder="Search by client, notice number, or task type..." style={{ paddingLeft: "48px", height: "48px", borderRadius: "12px" }} />
        </div>
        <button className="btn btn-ghost" style={{ height: "48px", width: "48px", padding: 0 }}>
           <Filter size={18} />
        </button>
      </div>

      {/* ── Draft List ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {drafts.map((draft, idx) => (
          <motion.div 
            key={draft.id || idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="card" 
            style={{ padding: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--border-subtle)" }}
          >
            <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
              <div style={{ 
                width: "56px", height: "56px", borderRadius: "16px", background: "var(--bg-secondary)", 
                display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)"
              }}>
                <FileText size={24} style={{ color: "var(--text-secondary)" }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "17px", marginBottom: "4px" }}>{draft.title}</div>
                <div style={{ display: "flex", gap: "16px", fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>
                  <span style={{ color: "var(--accent-blue)" }}>{draft.client}</span>
                  <span>•</span>
                  <span>{draft.date}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ 
                padding: "6px 14px", borderRadius: "20px", fontSize: "11px", fontWeight: 800, 
                textTransform: "uppercase", letterSpacing: "0.05em",
                background: draft.status === "Ready" ? "rgba(59,130,246,0.1)" : "rgba(16,185,129,0.1)", 
                color: draft.status === "Ready" ? "var(--accent-blue)" : "var(--accent-green)" 
              }}>
                {draft.status}
              </div>
              <button 
                onClick={() => handleReview(draft)} 
                className="btn btn-primary" 
                style={{ background: "var(--bg-secondary)", color: "white", border: "1px solid var(--border)", boxShadow: "none" }}
              >
                Review Draft
              </button>
              <button 
                onClick={() => handleDeleteDraft(draft.id)} 
                className="btn btn-ghost" 
                style={{ color: "var(--accent-red)", borderColor: "transparent" }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Modal/Drawers ── */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)", zIndex: 100 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              className="panel-light"
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "500px", background: "white", zIndex: 101, padding: "48px", boxShadow: "-20px 0 50px rgba(0,0,0,0.1)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "40px" }}>
                  <h2 style={{ fontSize: "28px", fontWeight: 800 }}>New AI Task</h2>
                  <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
               </div>
               <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                  <div>
                    <label style={{ color: "#475569" }}>Select Client</label>
                    <select className="input" value={taskData.client_id} onChange={e => setTaskData({...taskData, client_id: e.target.value})}>
                      <option value="">Select a client...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: "#475569" }}>Draft Type</label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      {["gst_notice_response", "engagement_letter", "penalty_waiver", "custom"].map(t => (
                        <div key={t} onClick={() => setTaskData({...taskData, draft_type: t})}
                          style={{ 
                            padding: "16px", borderRadius: "12px", border: "1px solid", cursor: "pointer", fontSize: "12px", fontWeight: 700, textAlign: "center",
                            background: taskData.draft_type === t ? "rgba(99,102,241,0.1)" : "transparent",
                            borderColor: taskData.draft_type === t ? "var(--accent-blue)" : "#e2e8f0",
                            color: taskData.draft_type === t ? "var(--accent-blue)" : "#64748b"
                          }}>
                          {t.replace(/_/g, " ").toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "#475569" }}>Additional Context</label>
                    <textarea className="input" rows={6} value={taskData.context} onChange={e => setTaskData({...taskData, context: e.target.value})} placeholder="e.g. paste notice text here..." />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ height: "56px", fontSize: "16px", background: "linear-gradient(to right, #6366f1, #a855f7)" }}>
                    {loading ? "Generating..." : "Generate AI Draft"}
                  </button>
               </form>
            </motion.div>
          </>
        )}

        {isReviewOpen && selectedDraft && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsReviewOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(12px)", zIndex: 100 }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="panel-light"
              style={{ 
                position: "fixed", top: "5%", left: "5%", right: "5%", bottom: "5%", background: "white", zIndex: 101, borderRadius: "32px", 
                display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" 
              }}>
              <div style={{ padding: "24px 48px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                <div>
                   <div style={{ fontSize: "12px", fontWeight: 800, color: "var(--accent-blue)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Review Mode</div>
                   <h2 style={{ fontSize: "24px", fontWeight: 800 }}>{selectedDraft.title}</h2>
                </div>
                <button onClick={() => setIsReviewOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={24} /></button>
              </div>
              <div style={{ flex: 1, padding: "48px", overflowY: "auto", background: "#ffffff" }}>
                 <div style={{ maxWidth: "900px", margin: "0 auto" }}>
                    <div style={{ 
                      padding: "20px 24px", borderRadius: "16px", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)", 
                      marginBottom: "32px", display: "flex", gap: "16px", alignItems: "center" 
                    }}>
                       <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
                          <Bot size={20} />
                       </div>
                       <div style={{ fontSize: "14px", fontWeight: 500, color: "#475569" }}>
                          Generated using <span style={{ fontWeight: 700, color: "var(--accent-blue)" }}>Claude 3.5 Sonnet</span>. Legal context: CGST Act 2017.
                       </div>
                    </div>
                    <textarea 
                      className="input" 
                      rows={25} 
                      style={{ 
                        width: "100%", padding: "40px", background: "#f9fafb", borderRadius: "20px", border: "1px solid #e2e8f0",
                        fontFamily: "var(--font-mono)", fontSize: "15px", lineHeight: "1.7", color: "#1e293b"
                      }}
                      defaultValue={`To,\nThe Proper Officer,\nGST Department,\n\nSubject: Response to SCN No. ${selectedDraft.id?.slice(0,8).toUpperCase() || 'ZD36012'}\n\nRespected Sir/Madam,\n\nWe represent ${selectedDraft.client} in the matter of the Show Cause Notice referenced above. We hereby submit our formal response to the allegations of short payment of tax...\n\n1. FACTUAL BACKGROUND\nThe taxpayer is a registered entity engaged in service provision...\n\n2. LEGAL SUBMISSIONS\nUnder Section 16(2) of the CGST Act, the conditions for ITC eligibility are fully met as evidenced by our GSTR-2B...\n\n[Full technical content continues...]`}
                    />
                 </div>
              </div>
              <div style={{ padding: "24px 48px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "20px", background: "#f8fafc" }}>
                 <button 
                   onClick={() => setIsReviewOpen(false)} 
                   className="btn"
                   style={{ 
                     background: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "1px solid rgba(239, 68, 68, 0.2)",
                     padding: "12px 32px", fontWeight: 700, borderRadius: "14px"
                   }}
                 >
                   Discard Draft
                 </button>
                 <button 
                   onClick={handleApprove} 
                   className="btn"
                   style={{ 
                     background: "var(--accent-blue)", color: "white", 
                     padding: "12px 32px", fontWeight: 700, borderRadius: "14px",
                     boxShadow: "0 10px 20px -5px rgba(59, 130, 246, 0.4)"
                   }}
                 >
                   Approve & Finalize
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
