"use client";
import { useState, useEffect } from "react";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, 
  Filter, Search, Clock, 
  CheckCircle2, AlertCircle, 
  FileWarning, MoreHorizontal,
  Download, Share2, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { toast } from "sonner";
import api from "@/lib/api/client";

interface ComplianceTask {
  id: string;
  client_name: string;
  task_type: string;
  status: string;
  priority: string;
}

export default function CompliancePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, any>>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/compliance/calendar", {
        params: {
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1
        }
      });
      setCalendarData(res.data.data);
    } catch (err) {
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    setProcessingId(taskId);
    try {
      await api.patch(`/compliance/tasks/${taskId}`, { status });
      toast.success(`Task marked as ${status.replace("_", " ")}`);
      await fetchCalendarData();
    } catch (err) {
      toast.error("Failed to update task");
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await api.post("/compliance/tasks/bulk-update-status", {
        task_ids: selectedTaskIds,
        status: "completed"
      });
      toast.success(`Successfully updated ${selectedTaskIds.length} tasks!`);
      setSelectedTaskIds([]);
      await fetchCalendarData();
    } catch (err) {
      toast.error("Failed to update tasks");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) 
        : [...prev, taskId]
    );
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getDayStatus = (dateStr: string) => {
    const tasks = calendarData[dateStr] || [];
    if (tasks.length === 0) return null;
    const completed = tasks.filter((t: any) => t.status === "completed").length;
    return {
      total: tasks.length,
      completed,
      percentage: (completed / tasks.length) * 100
    };
  };

  return (
    <>
      <div style={{ padding: "32px", height: "calc(100vh - 64px)", display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Compliance Calendar</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Track all GST, TDS, and ITR deadlines across your client portfolio.</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="btn btn-ghost" style={{ border: "1px solid var(--border-subtle)", gap: "8px" }} onClick={fetchCalendarData}>
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            {selectedTaskIds.length > 0 ? (
              <motion.button 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={`btn btn-primary ${isBulkUpdating ? "is-loading" : ""}`}
                style={{ gap: "8px", background: "var(--accent-green)", borderColor: "var(--accent-green)" }}
                onClick={handleBulkComplete}
              >
                {!isBulkUpdating && <CheckCircle2 size={18} />} Mark {selectedTaskIds.length} Done
              </motion.button>
            ) : (
              <button className="btn btn-primary" style={{ gap: "8px" }}>
                <Share2 size={18} /> Bulk Notify
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", flex: 1, overflow: "hidden" }}>
          {/* Left: Calendar View */}
          <div className="card" style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600 }}>{format(currentDate, "MMMM yyyy")}</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="btn btn-ghost" style={{ padding: "8px" }} onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                  <ChevronLeft size={20} />
                </button>
                <button className="btn btn-ghost" style={{ padding: "4px 12px", fontSize: "13px" }} onClick={() => setCurrentDate(new Date())}>Today</button>
                <button className="btn btn-ghost" style={{ padding: "8px" }} onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "1px", background: "var(--border-subtle)", border: "1px solid var(--border-subtle)", borderRadius: "12px", overflow: "hidden", flex: 1 }}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} style={{ background: "var(--bg-secondary)", padding: "12px", textAlign: "center", fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>{d}</div>
              ))}
              {days.map((day, i) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const status = getDayStatus(dateStr);
                const isSelected = isSameDay(day, selectedDate);

                return (
                  <motion.div 
                    key={dateStr}
                    whileHover={{ scale: 0.98 }}
                    onClick={() => setSelectedDate(day)}
                    style={{ 
                      background: "var(--bg-primary)", 
                      padding: "12px", 
                      minHeight: "100px",
                      cursor: "pointer",
                      position: "relative",
                      border: isSelected ? "2px solid var(--accent-blue)" : "none",
                      zIndex: isSelected ? 1 : 0
                    }}
                  >
                    <div style={{ 
                      fontSize: "14px", 
                      fontWeight: isToday(day) ? 700 : 500, 
                      color: isToday(day) ? "var(--accent-blue)" : "var(--text-primary)",
                      display: "flex",
                      justifyContent: "space-between"
                    }}>
                      {format(day, "d")}
                      {status && (
                        <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>{status.total} tasks</div>
                      )}
                    </div>
                    
                    {status && (
                      <div style={{ marginTop: "12px" }}>
                        <div style={{ width: "100%", height: "4px", background: "var(--bg-secondary)", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${status.percentage}%`, height: "100%", background: status.percentage === 100 ? "var(--accent-green)" : "var(--accent-blue)" }} />
                        </div>
                        <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {(calendarData[dateStr] || []).slice(0, 3).map((t: any, idx: number) => (
                            <div key={idx} style={{ 
                              fontSize: "10px", 
                              padding: "2px 6px", 
                              borderRadius: "4px", 
                              background: t.status === "completed" ? "var(--accent-green)15" : "var(--accent-blue)15",
                              color: t.status === "completed" ? "var(--accent-green)" : "var(--accent-blue)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "100%"
                            }}>
                              {t.task_type.replace("_", " ")}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Right: Task Details Panel */}
          <div style={{ width: "400px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div className="card" style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={20} style={{ color: "var(--accent-blue)" }} />
                {format(selectedDate, "do MMMM")}
              </h3>
              
              <div style={{ flex: 1, overflowY: "auto" }}>
                <AnimatePresence mode="wait">
                  {calendarData[format(selectedDate, "yyyy-MM-dd")]?.length > 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
                    >
                      {calendarData[format(selectedDate, "yyyy-MM-dd")].map((task: any) => (
                        <div key={task.id} style={{ 
                          padding: "16px", 
                          borderRadius: "12px", 
                          border: selectedTaskIds.includes(task.id) ? "1px solid var(--accent-blue)" : "1px solid var(--border-subtle)", 
                          background: selectedTaskIds.includes(task.id) ? "var(--accent-blue)05" : "var(--bg-secondary)",
                          display: "flex",
                          gap: "12px",
                          alignItems: "flex-start"
                        }}>
                          <input 
                            type="checkbox" 
                            checked={selectedTaskIds.includes(task.id)}
                            onChange={() => toggleTaskSelection(task.id)}
                            style={{ marginTop: "4px", width: "18px", height: "18px", cursor: "pointer" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>{task.task_type.replace("_", " ")}</span>
                              {task.status === "completed" ? <CheckCircle2 size={16} style={{ color: "var(--accent-green)" }} /> : <AlertCircle size={16} style={{ color: "var(--accent-orange)" }} />}
                            </div>
                            <div style={{ fontSize: "15px", fontWeight: 600, marginBottom: "12px" }}>Client: {task.client_name || "TechCorp Pvt Ltd"}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button 
                                  className={`btn btn-ghost ${processingId === task.id ? "is-loading" : ""}`}
                                  style={{ padding: "4px 10px", fontSize: "12px", border: "1px solid var(--border-subtle)", color: "var(--accent-green)" }}
                                  onClick={() => handleUpdateTaskStatus(task.id, "completed")}
                                  disabled={!!processingId}
                                >{!processingId && "✓ Mark Done"}</button>
                                <button 
                                  className={`btn btn-ghost ${processingId === task.id ? "is-loading" : ""}`}
                                  style={{ padding: "4px 10px", fontSize: "12px", border: "1px solid var(--border-subtle)" }}
                                  onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                                  disabled={!!processingId}
                                >{!processingId && "In Progress"}</button>
                              </div>
                              <button className="btn btn-ghost" style={{ padding: "4px" }}><MoreHorizontal size={18} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  ) : (
                    <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", textAlign: "center" }}>
                      <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "16px" }}>
                        <CalendarIcon size={32} style={{ opacity: 0.2 }} />
                      </div>
                      <p style={{ fontSize: "14px" }}>No deadlines scheduled for this date.</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
