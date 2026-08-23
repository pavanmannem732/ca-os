"use client";
import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, Building2, Shield, 
  MessageSquare, CreditCard, Users, 
  Globe, Bell, Save, Trash2, 
  Plus, MoreVertical, Key, X, RefreshCw, Eye, EyeOff
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import api from "@/lib/api/client";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("firm");
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "Junior Auditor" });
  const [loading, setLoading] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [firmData, setFirmData] = useState<any>({
    name: "",
    city: "",
    state: "",
    gstin: "",
    primary_email: "",
    primary_mobile: "",
    api_secret_key: null,
    key_last_rotated_at: null
  });

  useEffect(() => {
    fetchFirm();
  }, []);

  const fetchFirm = async () => {
    try {
      const res = await api.get("/firms/me");
      setFirmData(res.data.data);
    } catch (err) {
      toast.error("Failed to load firm profile");
    }
  };

  const handleUpdateFirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch("/firms/me", firmData);
      toast.success("Firm profile updated");
    } catch (err) {
      toast.error("Failed to update firm");
    } finally {
      setLoading(false);
    }
  };

  const handleRotateKey = async () => {
    if (!confirm("Are you sure? Any existing external integrations using this key will stop working immediately.")) return;
    
    setIsRotating(true);
    try {
      const res = await api.post("/firms/me/rotate-key");
      setFirmData({
        ...firmData,
        api_secret_key: res.data.data.api_secret_key,
        key_last_rotated_at: res.data.data.last_rotated_at
      });
      toast.success("API Secret Key rotated successfully");
    } catch (err) {
      toast.error("Failed to rotate key");
    } finally {
      setIsRotating(false);
    }
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Invitation sent to ${newStaff.email}`);
    setIsStaffModalOpen(false);
    setNewStaff({ name: "", email: "", role: "Junior Auditor" });
  };

  const tabs = [
    { id: "firm", label: "Firm Profile", icon: Building2 },
    { id: "staff", label: "Staff & Roles", icon: Users },
    { id: "whatsapp", label: "WhatsApp API", icon: MessageSquare },
    { id: "billing", label: "Billing & Payments", icon: CreditCard },
    { id: "security", label: "Security & Keys", icon: Shield },
  ];

  return (
    <div style={{ padding: "32px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "32px" }}>Settings</h1>

      <div style={{ display: "flex", gap: "40px" }}>
        {/* Navigation */}
        <div style={{ width: "240px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {tabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "10px", fontSize: "14px", fontWeight: 600, border: "none", cursor: "pointer", textAlign: "left",
                background: activeTab === tab.id ? "var(--accent-blue)10" : "transparent",
                color: activeTab === tab.id ? "var(--accent-blue)" : "var(--text-secondary)",
                transition: "all 0.2s"
              }}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div className="card" style={{ padding: "32px" }}>
            {activeTab === "firm" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Firm Profile</h3>
                <form onSubmit={handleUpdateFirm} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div className="form-group">
                    <label className="label">Firm Full Name</label>
                    <input className="input" value={firmData.name} onChange={e => setFirmData({...firmData, name: e.target.value})} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="form-group">
                      <label className="label">Primary Email (View Only)</label>
                      <input className="input" value={firmData.primary_email} disabled style={{ opacity: 0.6 }} />
                    </div>
                    <div className="form-group">
                      <label className="label">Primary Mobile (View Only)</label>
                      <input className="input" value={firmData.primary_mobile} disabled style={{ opacity: 0.6 }} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="form-group">
                      <label className="label">City</label>
                      <input className="input" value={firmData.city} onChange={e => setFirmData({...firmData, city: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="label">State</label>
                      <input className="input" value={firmData.state} onChange={e => setFirmData({...firmData, state: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="label">GSTIN</label>
                    <input className="input" value={firmData.gstin} onChange={e => setFirmData({...firmData, gstin: e.target.value})} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ alignSelf: "flex-start", gap: "8px" }}>
                    {loading ? "Saving..." : <><Save size={18} /> Save Changes</>}
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === "staff" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <AnimatePresence>
                  {isStaffModalOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onClick={() => setIsStaffModalOpen(false)}
                        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", backdropFilter: "blur(4px)", zIndex: 100 }} 
                      />
                      <motion.div 
                        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                        className="panel-light"
                        style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "400px", background: "white", zIndex: 101, boxShadow: "-10px 0 30px rgba(0,0,0,0.1)", padding: "40px" }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Invite Staff</h2>
                          <button onClick={() => setIsStaffModalOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleAddStaff} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          <div className="form-group">
                            <label className="label">Full Name</label>
                            <input className="input" required value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} placeholder="e.g. Rahul Varma" />
                          </div>
                          <div className="form-group">
                            <label className="label">Work Email</label>
                            <input className="input" type="email" required value={newStaff.email} onChange={e => setNewStaff({...newStaff, email: e.target.value})} placeholder="rahul@firm.in" />
                          </div>
                          <div className="form-group">
                            <label className="label">Role</label>
                            <select className="input" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})}>
                              <option>Senior Auditor</option>
                              <option>Junior Auditor</option>
                              <option>Articleship Trainee</option>
                            </select>
                          </div>
                          <button type="submit" className="btn btn-primary" style={{ marginTop: "12px" }}>Send Invitation</button>
                        </form>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 700 }}>Staff Management</h3>
                  <button onClick={() => setIsStaffModalOpen(true)} className="btn btn-primary btn-sm" style={{ gap: "6px" }}>
                    <Plus size={16} /> Add Staff
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { name: "Priya Sharma", role: "Senior Auditor", email: "priya@rk.in" },
                    { name: "Rahul Varma", role: "Articleship Trainee", email: "rahul@rk.in" },
                  ].map((s, i) => (
                    <div key={i} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{s.name.charAt(0)}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: "14px" }}>{s.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{s.role} • {s.email}</div>
                        </div>
                      </div>
                      <button className="btn btn-ghost" style={{ padding: "8px" }}><MoreVertical size={18} /></button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === "whatsapp" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>WhatsApp Business API</h3>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "24px" }}>Configure your Meta Cloud API credentials to enable automated client messaging.</p>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div className="form-group">
                    <label className="label">WABA ID (WhatsApp Business Account ID)</label>
                    <input className="input" type="password" value="********4592" />
                  </div>
                  <div className="form-group">
                    <label className="label">Permanent Access Token</label>
                    <textarea className="input" rows={3} value="EAAV..." />
                  </div>
                  <div style={{ padding: "16px", borderRadius: "12px", background: "var(--accent-green)05", border: "1px solid var(--accent-green)20", display: "flex", gap: "12px" }}>
                    <Shield size={20} color="var(--accent-green)" />
                    <div style={{ fontSize: "13px", color: "var(--accent-green)", fontWeight: 500 }}>API Connection is Active. 124 messages sent this month.</div>
                  </div>
                  <button className="btn btn-primary" style={{ alignSelf: "flex-start", gap: "8px" }}><Save size={18} /> Update API Settings</button>
                </div>
              </motion.div>
            )}

            {activeTab === "billing" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Billing & Payments</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                  <div style={{ padding: "24px", borderRadius: "16px", background: "linear-gradient(135deg, var(--accent-blue) 0%, #4facfe 100%)", color: "white" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                      <div>
                        <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "4px" }}>Current Plan</div>
                        <div style={{ fontSize: "24px", fontWeight: 800 }}>Professional Plan</div>
                      </div>
                      <div style={{ padding: "6px 12px", borderRadius: "20px", background: "rgba(255,255,255,0.2)", fontSize: "12px", fontWeight: 700 }}>ACTIVE</div>
                    </div>
                    <div style={{ fontSize: "14px", opacity: 0.9 }}>Next billing on June 15, 2026 for ₹4,999</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div className="card" style={{ padding: "20px" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>AI Drafts Used</div>
                      <div style={{ fontSize: "20px", fontWeight: 700 }}>42 / 500</div>
                      <div style={{ height: "4px", background: "var(--border-subtle)", borderRadius: "2px", marginTop: "12px", overflow: "hidden" }}>
                        <div style={{ width: "8.4%", height: "100%", background: "var(--accent-blue)" }} />
                      </div>
                    </div>
                    <div className="card" style={{ padding: "20px" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "8px" }}>WhatsApp Messages</div>
                      <div style={{ fontSize: "20px", fontWeight: 700 }}>1,240 / 5,000</div>
                      <div style={{ height: "4px", background: "var(--border-subtle)", borderRadius: "2px", marginTop: "12px", overflow: "hidden" }}>
                        <div style={{ width: "24.8%", height: "100%", background: "var(--accent-green)" }} />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>Recent Invoices</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {[
                        { id: "INV-2026-004", date: "May 15, 2026", amount: "₹4,999", status: "Paid" },
                        { id: "INV-2026-003", date: "Apr 15, 2026", amount: "₹4,999", status: "Paid" },
                      ].map((inv, i) => (
                        <div key={i} style={{ padding: "16px", borderRadius: "12px", border: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "14px" }}>{inv.id}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{inv.date}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ fontWeight: 700 }}>{inv.amount}</div>
                            <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-green)" }}>{inv.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "security" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "24px" }}>Security & API Keys</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ padding: "24px", borderRadius: "12px", border: "1px solid var(--border-subtle)", background: "var(--bg-secondary)30" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                      <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--accent-blue)10", color: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Key size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "15px" }}>Firm Secret Key</div>
                          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                            {firmData.key_last_rotated_at 
                              ? `Last rotated ${formatDistanceToNow(new Date(firmData.key_last_rotated_at))} ago` 
                              : "Never rotated"}
                          </div>
                        </div>
                      </div>
                      <button 
                        className={`btn btn-ghost ${isRotating ? "is-loading" : ""}`} 
                        style={{ fontSize: "12px", fontWeight: 700, border: "1px solid var(--border-subtle)" }}
                        onClick={handleRotateKey}
                        disabled={isRotating}
                      >
                        {!isRotating && <RefreshCw size={14} style={{ marginRight: "6px" }} />} REGENERATE
                      </button>
                    </div>

                    <div className="form-group">
                      <label className="label">API Secret Key (Used for Webhooks & External API)</label>
                      <div style={{ position: "relative" }}>
                        <input 
                          className="input" 
                          type={showKey ? "text" : "password"} 
                          readOnly 
                          value={firmData.api_secret_key || "Not generated yet"} 
                          style={{ fontFamily: "monospace", paddingRight: "40px" }}
                        />
                        <button 
                          onClick={() => setShowKey(!showKey)}
                          style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                        >
                          {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "8px", fontWeight: 500 }}>
                        ⚠️ Keep this key safe. Do not share it in public repositories.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
