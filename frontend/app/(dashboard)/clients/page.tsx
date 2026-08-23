"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Search, Plus, Filter, MoreVertical, 
  ShieldCheck, AlertTriangle, FileText, 
  ArrowUpRight, Users, Building2, ExternalLink 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api/client";

interface Client {
  id: string;
  name: string;
  client_type: string;
  gstin?: string;
  pan?: string;
  primary_contact_name: string;
  primary_mobile: string;
  primary_email?: string;
  compliance_services: string[];
  archived_at?: string;
  compliance_health_score: number;
  overdue_tasks_count: number;
  pending_documents_count: number;
  assigned_primary_staff: {
    full_name: string;
  };
}

export default function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [newClient, setNewClient] = useState({
    name: "",
    client_type: "company_private",
    gstin: "",
    pan: "",
    primary_contact_name: "",
    primary_mobile: "",
    primary_email: "",
    compliance_services: [] as string[]
  });

  useEffect(() => {
    fetchClients();
  }, [showArchived]);

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      api.get(`/clients/${editId}`).then(res => {
        const client = res.data.data;
        setEditingClient(client);
        setNewClient({
          name: client.name,
          client_type: client.client_type,
          gstin: client.gstin || "",
          pan: client.pan || "",
          primary_contact_name: client.primary_contact_name || "",
          primary_mobile: client.primary_mobile || "",
          primary_email: client.primary_email || "",
          compliance_services: client.compliance_services || [],
        });
        setIsModalOpen(true);
      });
    }
  }, [searchParams]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingClient) {
        await api.patch(`/clients/${editingClient.id}`, newClient);
        toast.success("Client updated successfully");
      } else {
        await api.post("/clients", newClient);
        toast.success("Client added successfully");
      }
      setIsModalOpen(false);
      setEditingClient(null);
      setNewClient({ name: "", client_type: "company_private", gstin: "", pan: "", primary_contact_name: "", primary_mobile: "", primary_email: "", compliance_services: [] });
      fetchClients();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.slice(-1)[0]}: ${d.msg}`).join(", ")
        : detail || "Failed to add client";
      toast.error(msg);
      console.error("Create client error:", err?.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveClient = async (clientId: string, clientName: string) => {
    console.log("Archiving client:", clientId, clientName);
    if (!confirm(`Archive "${clientName}"? This will hide them from the active list.`)) return;
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success(`${clientName} archived successfully`);
      fetchClients();
    } catch {
      toast.error("Failed to archive client");
    }
  };

  const handleRestoreClient = async (clientId: string, clientName: string) => {
    try {
      await api.post(`/clients/${clientId}/restore`);
      toast.success(`${clientName} restored successfully`);
      fetchClients();
    } catch {
      toast.error("Failed to restore client");
    }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients", { params: { include_archived: showArchived } });
      setClients(res.data.data);
    } catch (err) {
      toast.error("Failed to load clients");
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service: string) => {
    setNewClient(prev => ({
      ...prev,
      compliance_services: prev.compliance_services.includes(service)
        ? prev.compliance_services.filter(s => s !== service)
        : [...prev.compliance_services, service]
    }));
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.gstin?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "32px", position: "relative" }}>
      {/* Side Drawer Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsModalOpen(false); setEditingClient(null); }}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", zIndex: 100 }} 
            />
            <motion.div 
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="panel-light"
              style={{ 
                position: "fixed", top: 0, right: 0, bottom: 0, width: "500px", 
                background: "white", zIndex: 101, 
                boxShadow: "-20px 0 60px rgba(0,0,0,0.05)", 
                padding: "48px", overflowY: "auto",
                borderLeft: "1px solid #e2e8f0"
              }}
            >
              <div style={{ marginBottom: "40px" }}>
                <h2 style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>
                  {editingClient ? "Edit Client" : "Add New Client"}
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "15px", marginTop: "8px" }}>
                  {editingClient ? "Update entity details and compliance configuration." : "Register a new entity and initialize their compliance calendar."}
                </p>
              </div>

              <form onSubmit={handleCreateClient} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

                {/* Client Type */}
                <div className="form-group">
                  <label className="label" style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>Client Type</label>
                  <select className="input" value={newClient.client_type} onChange={e => setNewClient({...newClient, client_type: e.target.value})} style={{ height: "48px" }}>
                    <option value="company_private">Private Limited Company</option>
                    <option value="company_public">Public Limited Company</option>
                    <option value="llp">LLP</option>
                    <option value="partnership_firm">Partnership Firm</option>
                    <option value="proprietorship">Proprietorship</option>
                    <option value="individual">Individual</option>
                    <option value="huf">HUF</option>
                    <option value="trust">Trust / Society</option>
                  </select>
                </div>

                {/* Legal Name */}
                <div className="form-group">
                  <label className="label" style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>Full Legal Name *</label>
                  <input className="input" required value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="e.g. TechCorp Private Limited" style={{ height: "48px" }} />
                </div>

                {/* Contact Person */}
                <div className="form-group">
                  <label className="label" style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>Primary Contact Name *</label>
                  <input className="input" required value={newClient.primary_contact_name} onChange={e => setNewClient({...newClient, primary_contact_name: e.target.value})} placeholder="e.g. Ravi Kumar" style={{ height: "48px" }} />
                </div>

                {/* GSTIN + PAN */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label className="label" style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>GSTIN</label>
                    <input className="input" value={newClient.gstin} onChange={e => setNewClient({...newClient, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" style={{ height: "48px" }} />
                  </div>
                  <div className="form-group">
                    <label className="label" style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>PAN</label>
                    <input className="input" value={newClient.pan} onChange={e => setNewClient({...newClient, pan: e.target.value})} placeholder="AAAAA0000A" style={{ height: "48px" }} />
                  </div>
                </div>

                {/* Mobile + Email */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div className="form-group">
                    <label className="label" style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>Mobile *</label>
                    <input className="input" required value={newClient.primary_mobile} onChange={e => setNewClient({...newClient, primary_mobile: e.target.value})} placeholder="9876543210" style={{ height: "48px" }} />
                  </div>
                  <div className="form-group">
                    <label className="label" style={{ fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", display: "block" }}>Email</label>
                    <input className="input" type="email" value={newClient.primary_email} onChange={e => setNewClient({...newClient, primary_email: e.target.value})} placeholder="client@email.com" style={{ height: "48px" }} />
                  </div>
                </div>

                <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }} />

                <div>
                  <label className="label" style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px", display: "block" }}>Compliance Services</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    {["GST MONTHLY", "TDS QUARTERLY", "ITR ANNUAL", "ROC FILING"].map(service => (
                      <div 
                        key={service}
                        onClick={() => toggleService(service)}
                        style={{ 
                          display: "flex", alignItems: "center", gap: "8px"
                        }}
                      >
                        <div style={{ width: "16px", height: "16px", borderRadius: "4px", border: "2px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {newClient.compliance_services.includes(service) && <div style={{ width: "8px", height: "8px", background: "currentColor", borderRadius: "1px" }} />}
                        </div>
                        {service.replace("_", " ").toUpperCase()}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingClient(null); }} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {editingClient ? "Save Changes" : "Create Client"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Clients</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Manage your firm&apos;s client portfolio and compliance health.</p>
        </div>
        <button onClick={() => { setEditingClient(null); setIsModalOpen(true); }} className="btn btn-primary" style={{ gap: "8px" }}>
          <Plus size={18} />
          Add New Client
        </button>
      </div>

      {/* Stats Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
        {[
          { label: "Total Clients", value: clients.length, icon: Users, color: "var(--accent-blue)" },
          { label: "High Risk", value: clients.filter(c => c.compliance_health_score < 5).length, icon: AlertTriangle, color: "var(--accent-red)" },
          { label: "Documents Pending", value: clients.reduce((acc, c) => acc + c.pending_documents_count, 0), icon: FileText, color: "var(--accent-orange)" },
          { label: "On-Track", value: clients.filter(c => c.compliance_health_score >= 8).length, icon: ShieldCheck, color: "var(--accent-green)" },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${stat.color}15`, color: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <stat.icon size={20} />
              </div>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{stat.value}</div>
            <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input 
            className="input" 
            placeholder="Search by name, GSTIN or PAN..." 
            style={{ paddingLeft: "44px" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-ghost" style={{ border: "1px solid var(--border-subtle)", gap: "8px" }}>
          <Filter size={18} />
          Filters
        </button>
        <button 
          onClick={() => setShowArchived(!showArchived)}
          className={`btn ${showArchived ? 'btn-primary' : 'btn-ghost'}`}
          style={{ border: showArchived ? "none" : "1px solid var(--border-subtle)", gap: "8px", fontSize: "14px" }}
        >
          {showArchived ? "Viewing Archived" : "Show Archived"}
        </button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: "visible" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Client Name</th>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>GSTIN / PAN</th>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Health Score</th>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Pending Actions</th>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Assigned Staff</th>
              <th style={{ width: "60px" }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td colSpan={6} style={{ padding: "24px", textAlign: "center" }}>
                    <div className="skeleton" style={{ height: "20px", width: "100%" }} />
                  </td>
                </tr>
              ))
            ) : filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "60px", textAlign: "center", color: "var(--text-muted)" }}>
                  <div style={{ marginBottom: "16px" }}><Building2 size={48} style={{ opacity: 0.2, margin: "0 auto" }} /></div>
                  No clients found matching your search.
                </td>
              </tr>
            ) : filteredClients.map((client) => (
              <tr key={client.id} className="table-row" style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }}>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{client.name}</div>
                  <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{client.client_type.replace("_", " ").toUpperCase()}</div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ fontSize: "13px", fontFamily: "var(--font-mono)" }}>{client.gstin || "N/A"}</div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "100px", height: "6px", background: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ 
                        width: `${client.compliance_health_score * 10}%`, 
                        height: "100%", 
                        background: client.compliance_health_score > 7 ? "var(--accent-green)" : client.compliance_health_score > 4 ? "var(--accent-orange)" : "var(--accent-red)"
                      }} />
                    </div>
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>{client.compliance_health_score}/10</span>
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", gap: "12px" }}>
                    {client.overdue_tasks_count > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent-red)", fontSize: "12px", fontWeight: 600 }}>
                        <AlertTriangle size={14} /> {client.overdue_tasks_count} Overdue
                      </div>
                    )}
                    {client.pending_documents_count > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent-orange)", fontSize: "12px", fontWeight: 600 }}>
                        <FileText size={14} /> {client.pending_documents_count} Docs
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "var(--accent-blue)10", color: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>
                      {client.assigned_primary_staff?.full_name?.charAt(0)}
                    </div>
                    <span style={{ fontSize: "13px" }}>{client.assigned_primary_staff?.full_name || "Unassigned"}</span>
                  </div>
                </td>
                <td style={{ padding: "16px 24px", textAlign: "right", position: "relative" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "8px" }}
                    onClick={e => {
                      e.stopPropagation();
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                      setActiveMenu(activeMenu === client.id ? null : client.id);
                    }}
                  >
                    <MoreVertical size={18} />
                  </button>

                  {activeMenu === client.id && (
                    <>
                      {/* Click-outside overlay */}
                      <div
                        style={{ position: "fixed", inset: 0, zIndex: 10 }}
                        onClick={() => setActiveMenu(null)}
                      />
                      {/* Dropdown — fixed so it escapes any overflow:hidden parent */}
                      <div style={{
                        position: "fixed", top: `${menuPos.top}px`, right: `${menuPos.right}px`, zIndex: 9999,
                        background: "var(--bg-card)", border: "1px solid var(--border)",
                        borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                        padding: "6px", minWidth: "180px"
                      }}>
                        {[
                          { label: "View Details", icon: "👁", action: () => { setActiveMenu(null); router.push(`/clients/${client.id}`); } },
                          { label: "Edit Client", icon: "✏️", action: () => { 
                            setActiveMenu(null); 
                            setEditingClient(client);
                            setNewClient({
                              name: client.name,
                              client_type: client.client_type,
                              gstin: client.gstin || "",
                              pan: client.pan || "",
                              primary_contact_name: client.primary_contact_name || "",
                              primary_mobile: client.primary_mobile || "",
                              primary_email: client.primary_email || "",
                              compliance_services: client.compliance_services || [],
                            });
                            setIsModalOpen(true); 
                          } },
                          { label: "Create Invoice", icon: "🧾", action: () => { setActiveMenu(null); router.push(`/billing/invoices/new?client_id=${client.id}`); } },
                          client.archived_at 
                            ? { label: "Restore", icon: "♻️", action: () => { setActiveMenu(null); handleRestoreClient(client.id, client.name); } }
                            : { label: "Archive", icon: "🗄", action: () => { setActiveMenu(null); handleArchiveClient(client.id, client.name); }, danger: true },
                        ].map(item => (
                          <button
                            key={item.label}
                            onClick={item.action}
                            style={{
                              display: "flex", alignItems: "center", gap: "10px",
                              width: "100%", padding: "10px 14px",
                              background: "none", border: "none", cursor: "pointer",
                              borderRadius: "8px", fontSize: "14px", textAlign: "left",
                              color: (item as any).danger ? "var(--accent-red)" : "var(--text-primary)",
                              transition: "background 0.1s",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-card-hover)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "none")}
                          >
                            <span>{item.icon}</span> {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
