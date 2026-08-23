"use client";
import { useEffect, useState } from "react";
import { 
  Plus, Trash2, Save, Send, 
  ChevronLeft, IndianRupee,
  Calculator, ShieldCheck, CreditCard
} from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api/client";

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState([{ id: 1, description: "Monthly GST Filing Fee", rate: 5000, quantity: 1 }]);
  const [clientId, setClientId] = useState(searchParams.get("client_id") || "");
  const [clients, setClients] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get("/clients").then(res => setClients(res.data.data)).catch(() => {});
  }, []);

  const addItem = () => setItems([...items, { id: Date.now(), description: "", rate: 0, quantity: 1 }]);
  const removeItem = (id: number) => { if (items.length > 1) setItems(items.filter(i => i.id !== id)); };
  const updateItem = (id: number, field: string, value: any) => setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));

  const subtotal = items.reduce((acc, item) => acc + (item.rate * item.quantity), 0);
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  const buildPayload = (isDraft: boolean) => ({
    client_id: clientId || "00000000-0000-0000-0000-000000000001",
    invoice_date: new Date().toISOString().split("T")[0],
    line_items: items.map(i => ({ description: i.description, quantity: i.quantity, rate: i.rate, amount: i.rate * i.quantity })),
    gst_rate: 18.0,
    notes,
  });

  const handleSaveDraft = async () => {
    if (!clientId) { toast.error("Please select a client first"); return; }
    setSaving(true);
    try {
      const res = await api.post("/billing/invoices", buildPayload(true));
      toast.success(`Draft saved — ${res.data.data.invoice_number}`);
      router.push("/billing");
    } catch (err: any) { 
      toast.error(err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail?.[0]?.msg || "Failed to save draft"); 
    }
    finally { setSaving(false); }
  };

  const handleFinalize = async () => {
    if (!clientId) { toast.error("Please select a client first"); return; }
    setSending(true);
    try {
      const res = await api.post("/billing/invoices", buildPayload(false));
      const invoiceId = res.data.data.id;
      await api.post(`/billing/invoices/${invoiceId}/send`);
      toast.success("Invoice sent with Razorpay payment link!");
      router.push("/billing");
    } catch (err: any) { 
      toast.error(err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail?.[0]?.msg || "Failed to send invoice"); 
    }
    finally { setSending(false); }
  };


  return (
    <div style={{ padding: "32px", maxWidth: "1000px", margin: "0 auto" }}>
      {/* Navigation */}
      <Link href="/billing" style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px", textDecoration: "none" }}>
        <ChevronLeft size={16} /> Back to Billing
      </Link>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700 }}>Create New Invoice</h1>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleSaveDraft} disabled={saving} className="btn btn-ghost" style={{ border: "1px solid var(--border-subtle)", gap: "8px" }}>
            <Save size={18} /> {saving ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={handleFinalize} disabled={sending} className="btn btn-primary" style={{ gap: "8px" }}>
            <Send size={18} /> {sending ? "Sending..." : "Finalize & Send"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "32px" }}>
        {/* Main Form */}
        <div className="card" style={{ padding: "32px" }}>
          {/* Client Selection */}
          <div style={{ marginBottom: "32px" }}>
            <label className="label" style={{ marginBottom: "12px", display: "block" }}>Select Client</label>
            <select className="input" style={{ width: "100%" }} value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Search for a client...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Line Items */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "16px", fontWeight: 700 }}>Service Line Items</h3>
              <button onClick={addItem} className="btn btn-ghost" style={{ fontSize: "13px", color: "var(--accent-blue)", padding: "4px 8px" }}>
                <Plus size={14} style={{ marginRight: "4px" }} /> Add Item
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {items.map((item, index) => (
                <div key={item.id} style={{ display: "grid", gridTemplateColumns: "1fr 120px 100px 40px", gap: "16px", alignItems: "end" }}>
                  <div className="form-group">
                    {index === 0 && <label className="label">Description / SAC Code</label>}
                    <input className="input" placeholder="e.g. Audit Fees (SAC 998211)" value={item.description} onChange={e => updateItem(item.id, "description", e.target.value)} />
                  </div>
                  <div className="form-group">
                    {index === 0 && <label className="label">Rate (₹)</label>}
                    <input className="input" type="number" value={item.rate} onChange={e => updateItem(item.id, "rate", Number(e.target.value))} />
                  </div>
                  <div className="form-group">
                    {index === 0 && <label className="label">Qty</label>}
                    <input className="input" type="number" value={item.quantity} onChange={e => updateItem(item.id, "quantity", Number(e.target.value))} />
                  </div>
                  <button onClick={() => removeItem(item.id)} style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", paddingBottom: "12px" }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="label">Additional Notes / Terms</label>
            <textarea className="input" rows={4} placeholder="Payment due within 7 days. Thank you for your business!" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* Summary Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="card" style={{ padding: "24px", background: "var(--bg-secondary)" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Calculator size={18} color="var(--accent-blue)" /> Invoice Summary
            </h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>₹{subtotal.toLocaleString()}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                <span style={{ color: "var(--text-secondary)" }}>GST (18%)</span>
                <span style={{ fontWeight: 600 }}>₹{gst.toLocaleString()}</span>
              </div>
              <div style={{ height: "1px", background: "var(--border-subtle)", margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "18px", fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: "var(--accent-blue)" }}>₹{total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: "24px", background: "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)", border: "1px solid #dbeafe" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <CreditCard size={20} color="var(--accent-blue)" />
              <h3 style={{ fontSize: "14px", fontWeight: 700 }}>Payment Method</h3>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: "16px" }}>
              This invoice will be sent with an active **Razorpay Payment Link** for UPI, Cards, and Netbanking.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 700, color: "var(--accent-green)" }}>
              <ShieldCheck size={14} /> SECURE RAZORPAY INTEGRATION
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
