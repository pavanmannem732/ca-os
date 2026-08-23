"use client";
import { useState, useEffect } from "react";
import { 
  CreditCard, DollarSign, TrendingUp, 
  Clock, Download, Filter, 
  MoreVertical, CheckCircle2, Trash2,
  ArrowUpRight, ArrowDownRight,
  Plus, Eye, X, IndianRupee, FileText, Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import api from "@/lib/api/client";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = filterStatus !== "All" ? { status: filterStatus.toLowerCase() } : {};
      const res = await api.get("/billing/invoices", { params });
      setInvoices(res.data.data || []);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/billing/invoices/${id}`);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch {
      toast.error("Failed to delete invoice");
    }
  };

  const handlePreview = async (id: string) => {
    setPreviewLoading(true);
    setIsPreviewOpen(true);
    try {
      const res = await api.get(`/billing/invoices/${id}`);
      setSelectedInvoice(res.data.data);
    } catch {
      toast.error("Failed to load invoice details");
      setIsPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExport = () => {
    if (!invoices || invoices.length === 0) {
      toast.error("No invoices to export.");
      return;
    }
    
    // Create CSV header
    const headers = ["Invoice Number", "Amount", "Due Date", "Status", "Created Date"];
    
    // Create CSV rows
    const rows = invoices.map(inv => [
      inv.invoice_number || "-",
      inv.total_amount || 0,
      inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-",
      (inv.status || "DRAFT").toUpperCase(),
      inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "-"
    ]);
    
    // Combine into CSV string
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    
    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Export downloaded successfully!");
  };

  return (
    <>
      <div style={{ padding: "32px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Billing & Revenue</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Manage invoices, track payments, and analyze your firm&apos;s financial growth.</p>
          </div>
          <Link href="/billing/invoices/new">
            <button className="btn btn-primary" style={{ gap: "8px", cursor: "pointer" }}>
              <Plus size={18} /> Create Invoice
            </button>
          </Link>
        </div>

        {/* Revenue Stats (Placeholders) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "32px" }}>
          {[
            { label: "Total Revenue", value: "₹4,25,000", trend: "+12.5%", positive: true, icon: TrendingUp, color: "var(--accent-blue)" },
            { label: "Outstanding", value: "₹82,500", trend: "-4.2%", positive: true, icon: Clock, color: "var(--accent-orange)" },
            { label: "Collected (MTD)", value: "₹1,15,000", trend: "+8.1%", positive: true, icon: CheckCircle2, color: "var(--accent-green)" },
            { label: "Avg. Per Client", value: "₹8,500", trend: "0.0%", positive: true, icon: CreditCard, color: "var(--accent-blue)" },
          ].map((stat, i) => (
            <div key={i} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${stat.color}15`, color: stat.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <stat.icon size={20} />
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "2px", 
                  fontSize: "12px", 
                  fontWeight: 600, 
                  color: stat.positive ? "var(--accent-green)" : "var(--accent-red)",
                  background: stat.positive ? "var(--accent-green)10" : "var(--accent-red)10",
                  padding: "2px 8px",
                  borderRadius: "20px"
                }}>
                  {stat.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.trend}
                </div>
              </div>
              <div style={{ fontSize: "24px", fontWeight: 700 }}>{stat.value}</div>
              <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Recent Invoices */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", position: "relative" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Recent Invoices</h2>
          <div style={{ display: "flex", gap: "12px" }}>
            <button 
              onClick={handleExport}
              className="btn btn-ghost" 
              style={{ border: "1px solid var(--border-subtle)", gap: "8px" }}
            >
              <Download size={18} /> Export
            </button>
            
            <div style={{ position: "relative" }}>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-ghost" 
                style={{ border: filterStatus !== "All" ? "1px solid var(--accent-blue)" : "1px solid var(--border-subtle)", gap: "8px", background: filterStatus !== "All" ? "var(--accent-blue)10" : "" }}
              >
                <Filter size={18} /> {filterStatus !== "All" ? `Status: ${filterStatus}` : "Filters"}
              </button>
              
              {showFilters && (
                <div className="card" style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", padding: "12px", zIndex: 50, width: "160px", display: "flex", flexDirection: "column", gap: "4px", boxShadow: "0 4px 20px rgba(0,0,0,0.15)", background: "var(--bg-card)" }}>
                  {["All", "Draft", "Sent", "Paid", "Overdue"].map(s => (
                    <button 
                      key={s}
                      onClick={() => { setFilterStatus(s); setShowFilters(false); }}
                      className="dropdown-item"
                      style={{ 
                        textAlign: "left", 
                        padding: "8px 12px", 
                        background: filterStatus === s ? "var(--bg-secondary)" : "transparent", 
                        color: filterStatus === s ? "var(--text-primary)" : "var(--text-secondary)",
                        border: "none", 
                        borderRadius: "6px", 
                        cursor: "pointer", 
                        fontWeight: filterStatus === s ? 600 : 400,
                        fontSize: "14px"
                      }}
                      onMouseEnter={(e) => { if (filterStatus !== s) e.currentTarget.style.background = "var(--bg-secondary)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                      onMouseLeave={(e) => { if (filterStatus !== s) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Invoice #</th>
                <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Amount</th>
                <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Due Date</th>
                <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Status</th>
                <th style={{ width: "60px" }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center" }}>Loading invoices...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>No invoices found. Create one to get started.</td></tr>
              ) : (
                invoices.map((inv, i) => (
                  <tr key={i} className="table-row" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 600 }}>{inv.invoice_number}</td>
                    <td style={{ padding: "16px 24px", fontSize: "14px", fontWeight: 700 }}>₹{inv.total_amount?.toLocaleString() || "0"}</td>
                    <td style={{ padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)" }}>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "-"}</td>
                    <td style={{ padding: "16px 24px" }}>
                      <div style={{ 
                        display: "inline-flex", 
                        padding: "4px 12px", 
                        borderRadius: "20px", 
                        fontSize: "12px", 
                        fontWeight: 600,
                        background: inv.status === "paid" ? "var(--accent-green)10" : inv.status === "sent" ? "var(--accent-blue)10" : "var(--accent-orange)10",
                        color: inv.status === "paid" ? "var(--accent-green)" : inv.status === "sent" ? "var(--accent-blue)" : "var(--accent-orange)"
                      }}>
                        {inv.status?.toUpperCase() || "DRAFT"}
                      </div>
                    </td>
                    <td style={{ padding: "16px 24px", textAlign: "right", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                      <button 
                        className="btn btn-ghost" 
                        onClick={() => handlePreview(inv.id)}
                        style={{ padding: "8px", color: "var(--accent-blue)" }}
                        title="Preview Invoice"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        className="btn btn-ghost" 
                        onClick={() => handleDelete(inv.id)}
                        style={{ padding: "8px", color: "var(--accent-red)" }}
                        title="Delete Invoice"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AnimatePresence>
          {isPreviewOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsPreviewOpen(false)}
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)", zIndex: 100 }} 
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                className="panel-light"
                style={{ 
                  position: "fixed", top: "5%", left: "50%", transform: "translateX(-50%)", 
                  width: "90%", maxWidth: "800px", bottom: "5%", background: "white", 
                  zIndex: 101, borderRadius: "24px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", 
                  overflow: "hidden", display: "flex", flexDirection: "column" 
                }}
              >
                <div style={{ padding: "24px 40px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                  <div>
                    <div className="accent-blue" style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase", marginBottom: "4px" }}>Invoice Preview</div>
                    <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#1e293b" }}>{selectedInvoice?.invoice_number || "Loading..."}</h2>
                  </div>
                  <button onClick={() => setIsPreviewOpen(false)} className="btn btn-ghost" style={{ padding: "8px", color: "#475569" }}><X size={24} /></button>
                </div>

                <div style={{ flex: 1, padding: "40px", overflowY: "auto" }}>
                  {previewLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-muted)" }}>
                      Loading invoice details...
                    </div>
                  ) : selectedInvoice && (
                    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
                      {/* Invoice Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "40px" }}>
                        <div>
                          <div style={{ fontSize: "24px", fontWeight: 800, color: "#0f172a", marginBottom: "8px" }}>INVOICE</div>
                          <div style={{ fontSize: "14px", color: "#64748b" }}>Date: {new Date(selectedInvoice.invoice_date).toLocaleDateString()}</div>
                          {selectedInvoice.due_date && <div style={{ fontSize: "14px", color: "#ef4444", fontWeight: 600 }}>Due: {new Date(selectedInvoice.due_date).toLocaleDateString()}</div>}
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, fontSize: "16px" }}>CA-OS Practice OS</div>
                          <div style={{ fontSize: "13px", color: "#64748b" }}>Chartered Accountants</div>
                        </div>
                      </div>

                      {/* Table */}
                      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "32px" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #f1f5f9" }}>
                            <th style={{ textAlign: "left", padding: "12px 0", fontSize: "13px", color: "#64748b", textTransform: "uppercase" }}>Description</th>
                            <th style={{ textAlign: "center", padding: "12px 0", fontSize: "13px", color: "#64748b", textTransform: "uppercase" }}>Qty</th>
                            <th style={{ textAlign: "right", padding: "12px 0", fontSize: "13px", color: "#64748b", textTransform: "uppercase" }}>Rate</th>
                            <th style={{ textAlign: "right", padding: "12px 0", fontSize: "13px", color: "#64748b", textTransform: "uppercase" }}>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.line_items?.map((item: any, i: number) => (
                            <tr key={i} style={{ borderBottom: "1px solid #f8fafc" }}>
                              <td style={{ padding: "16px 0", fontSize: "14px", fontWeight: 500 }}>{item.description}</td>
                              <td style={{ padding: "16px 0", textAlign: "center", fontSize: "14px" }}>{item.quantity}</td>
                              <td style={{ padding: "16px 0", textAlign: "right", fontSize: "14px" }}>₹{item.rate?.toLocaleString()}</td>
                              <td style={{ padding: "16px 0", textAlign: "right", fontSize: "14px", fontWeight: 600 }}>₹{item.amount?.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "40px" }}>
                        <div style={{ width: "240px", display: "flex", flexDirection: "column", gap: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                            <span style={{ color: "#64748b" }}>Subtotal</span>
                            <span style={{ fontWeight: 600 }}>₹{selectedInvoice.subtotal?.toLocaleString()}</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                            <span style={{ color: "#64748b" }}>GST (18%)</span>
                            <span style={{ fontWeight: 600 }}>₹{selectedInvoice.gst_amount?.toLocaleString()}</span>
                          </div>
                          <div style={{ height: "1px", background: "#e2e8f0", margin: "4px 0" }} />
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 800 }}>
                            <span>Total</span>
                            <span style={{ color: "var(--accent-blue)" }}>₹{selectedInvoice.total_amount?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {selectedInvoice.notes && (
                        <div style={{ padding: "20px", borderRadius: "12px", background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                          <div style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>Notes</div>
                          <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>{selectedInvoice.notes}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ padding: "24px 40px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: "16px", background: "#f8fafc" }}>
                  <button 
                    onClick={() => setIsPreviewOpen(false)} 
                    className="btn btn-ghost" 
                    style={{ padding: "10px 24px", fontWeight: 700, borderRadius: "10px" }}
                  >
                    Close Preview
                  </button>
                  {selectedInvoice?.status === "draft" && (
                    <button className="btn btn-primary" style={{ padding: "10px 24px", fontWeight: 700, borderRadius: "10px", gap: "8px" }}>
                      <Send size={18} /> Finalize & Send
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

