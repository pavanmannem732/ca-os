"use client";
import { useState, useEffect } from "react";
import { Users, Plus, BarChart2, CheckCircle, AlertCircle, X, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api/client";

const COLUMNS = ["not_started", "in_progress", "in_review", "completed"];
const COLUMN_LABELS: Record<string, string> = {
  not_started: "Not Started", in_progress: "In Progress",
  in_review: "In Review", completed: "Completed",
};
const COLUMN_COLORS: Record<string, string> = {
  not_started: "#94a3b8", in_progress: "#3b82f6",
  in_review: "#f59e0b", completed: "#22c55e",
};

const MOCK_STAFF = [
  { id: "1", name: "Ravi Kumar", role: "Senior Auditor", tasks: 8, completed: 5, overdue: 1, lastActive: "2 hrs ago" },
  { id: "2", name: "Priya Sharma", role: "Junior Auditor", tasks: 12, completed: 9, overdue: 0, lastActive: "30 mins ago" },
  { id: "3", name: "Arjun Mehta", role: "Articleship Trainee", tasks: 4, completed: 2, overdue: 2, lastActive: "1 day ago" },
];

const MOCK_TASKS = [
  { id: "1", task_type: "gstr_1", status: "not_started", client_name: "TechCorp Pvt Ltd", due_date: "2026-05-15" },
  { id: "2", task_type: "tds_q4", status: "in_progress", client_name: "Rajesh Exports", due_date: "2026-05-20" },
  { id: "3", task_type: "itr_filing", status: "in_review", client_name: "Manufacturing Co.", due_date: "2026-05-31" },
  { id: "4", task_type: "gstr_3b", status: "completed", client_name: "Startup Inc.", due_date: "2026-05-10" },
];

export default function StaffPage() {
  const [view, setView] = useState<"team" | "kanban">("team");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [invite, setInvite] = useState({ name: "", email: "", mobile: "", role: "ca_staff_junior" });
  const [staffList, setStaffList] = useState<any[]>([]);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    fetchStaff();
    api.get("/compliance/tasks").then(res => setTasks(res.data.data || MOCK_TASKS)).catch(() => setTasks(MOCK_TASKS));
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get("/staff");
      setStaffList(res.data.data);
    } catch {
      console.error("Failed to load staff");
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await api.patch(`/compliance/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      toast.success("Task status updated");
    } catch { toast.error("Failed to update task"); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/staff/invite", {
        full_name: invite.name,
        email: invite.email,
        mobile: invite.mobile,
        role: invite.role
      });
      toast.success(`Invitation sent to ${invite.email}`);
      setIsInviteOpen(false);
      setInvite({ name: "", email: "", mobile: "", role: "ca_staff_junior" });
      fetchStaff();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send invitation");
    }
  };

  return (
    <div style={{ padding: "32px" }}>
      <AnimatePresence>
        {isInviteOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsInviteOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", backdropFilter: "blur(4px)", zIndex: 100 }} />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="panel-light"
              style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "420px", background: "white", zIndex: 101, padding: "48px", borderLeft: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
                <h2 style={{ fontSize: "24px", fontWeight: 800 }}>Invite Staff</h2>
                <button onClick={() => setIsInviteOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} /></button>
              </div>
              <form onSubmit={handleInvite} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="form-group">
                  <label className="label">Full Name</label>
                  <input className="input" required value={invite.name} onChange={e => setInvite({ ...invite, name: e.target.value })} placeholder="e.g. Rahul Varma" />
                </div>
                <div className="form-group">
                  <label className="label">Work Email</label>
                  <input className="input" type="email" required value={invite.email} onChange={e => setInvite({ ...invite, email: e.target.value })} placeholder="rahul@firm.in" />
                </div>
                <div className="form-group">
                  <label className="label">Mobile Number *</label>
                  <input className="input" required value={invite.mobile} onChange={e => setInvite({ ...invite, mobile: e.target.value })} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label className="label">Role</label>
                  <select className="input" value={invite.role} onChange={e => setInvite({ ...invite, role: e.target.value })}>
                    <option value="ca_staff_senior">Senior Auditor</option>
                    <option value="ca_staff_junior">Junior Auditor</option>
                    <option value="articleship">Articleship Trainee</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: "48px", fontWeight: 700, marginTop: "8px" }}>
                  <Mail size={16} style={{ marginRight: "8px" }} /> Send Invitation
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="card"
              style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: "450px", background: "var(--bg-card)", zIndex: 101, padding: "32px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-blue)", textTransform: "uppercase" }}>Task Details</h3>
                <button onClick={() => setSelectedTask(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
              </div>
              <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px" }}>{selectedTask.task_type.replace(/_/g, " ").toUpperCase()}</h2>
              <div style={{ fontSize: "16px", color: "var(--text-primary)", marginBottom: "24px" }}>{selectedTask.client_name}</div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>STATUS</div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{COLUMN_LABELS[selectedTask.status]}</div>
                </div>
                <div style={{ padding: "12px", background: "var(--bg-secondary)", borderRadius: "10px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>DUE DATE</div>
                  <div style={{ fontSize: "14px", fontWeight: 600 }}>{selectedTask.due_date}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                <button onClick={() => setSelectedTask(null)} className="btn btn-ghost" style={{ flex: 1 }}>Close</button>
                <button onClick={() => { updateTaskStatus(selectedTask.id, "completed"); setSelectedTask(null); }} className="btn btn-primary" style={{ flex: 1 }}>Mark Complete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700 }}>Staff & Tasks</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Manage team workload and track task progress.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <div style={{ display: "flex", background: "rgba(30, 41, 59, 0.5)", borderRadius: "10px", padding: "4px", border: "1px solid var(--border)" }}>
            {(["team", "kanban"] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ 
                  padding: "8px 24px", borderRadius: "8px", border: "none", cursor: "pointer", 
                  fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.5px",
                  background: view === v ? "var(--accent-blue)" : "transparent", 
                  color: view === v ? "white" : "var(--text-secondary)", 
                  boxShadow: view === v ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none", 
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)" 
                }}>
                {v === "team" ? "Team" : "Kanban"}
              </button>
            ))}
          </div>
          <button onClick={() => setIsInviteOpen(true)} className="btn btn-primary" style={{ gap: "8px" }}>
            <Plus size={18} /> Add Staff
          </button>
        </div>
      </div>

      {view === "team" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {staffList.map(staff => (
            <div key={staff.id} className="card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: "20px" }}>
                  {staff.full_name?.charAt(0) || "S"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "16px" }}>{staff.full_name}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>{staff.role.replace(/_/g, " ").toUpperCase()}</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
                {[
                  { label: "Tasks", value: staff.tasks || 0, color: "var(--accent-blue)" },
                  { label: "Done", value: staff.completed || 0, color: "var(--accent-green)" },
                  { label: "Overdue", value: staff.overdue || 0, color: (staff.overdue || 0) > 0 ? "#ef4444" : "var(--text-muted)" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: "center", padding: "10px", background: "var(--bg-secondary)", borderRadius: "10px" }}>
                    <div style={{ fontSize: "22px", fontWeight: 800, color }}>{value}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{label}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{staff.email}</span>
                <button 
                  onClick={() => setView("kanban")}
                  className="btn btn-ghost" 
                  style={{ fontSize: "13px", border: "1px solid var(--border-subtle)" }}
                >
                  View Tasks
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px" }}>
          {COLUMNS.map(col => (
            <div key={col} style={{ background: "rgba(15, 23, 42, 0.4)", border: "1px solid var(--border)", borderRadius: "20px", padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLUMN_COLORS[col] }} />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>{COLUMN_LABELS[col]}</span>
                <span style={{ marginLeft: "auto", background: "var(--bg-primary)", borderRadius: "20px", padding: "2px 10px", fontSize: "12px", fontWeight: 700 }}>
                  {tasks.filter(t => t.status === col).length}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {tasks.filter(t => t.status === col).map(task => (
                  <div 
                    key={task.id} 
                    className="card" 
                    onClick={() => setSelectedTask(task)}
                    style={{ padding: "14px", cursor: "pointer" }}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "4px" }}>
                      {task.task_type.replace(/_/g, " ")}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "10px" }}>{task.client_name}</div>
                    <select onChange={e => updateTaskStatus(task.id, e.target.value)} defaultValue={task.status}
                      style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--border-subtle)", fontSize: "12px", background: "var(--bg-secondary)", cursor: "pointer" }}>
                      {COLUMNS.map(c => <option key={c} value={c}>{COLUMN_LABELS[c]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
