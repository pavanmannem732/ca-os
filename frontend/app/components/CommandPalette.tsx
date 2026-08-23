"use client";
import { useState, useEffect, useRef } from "react";
import { 
  Search, FileText, User, Calendar, 
  ArrowRight, Zap, X, Command, Bot
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import api from "@/lib/api/client";

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Auto-focus input
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        // Calling our new Search Architecture endpoint
        const res = await api.get(`/clients/search?q=${encodeURIComponent(query)}`);
        const searchResults = (res.data.data || []).map((r: any) => ({
          id: r.id,
          title: r.name,
          subtitle: r.gstin || r.pan || "Client",
          type: "client",
          href: `/clients/${r.id}`
        }));
        
        // Mocking some other types for the palette
        const actions = [
          { id: "new-client", title: "Add New Client", type: "action", href: "/clients/new", icon: User },
          { id: "ai-draft", title: "Generate AI Draft", type: "action", href: "/ai", icon: Bot },
          { id: "compliance", title: "View Compliance Calendar", type: "action", href: "/compliance", icon: Calendar },
        ].filter(a => a.title.toLowerCase().includes(query.toLowerCase()));

        setResults([...actions, ...searchResults]);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: any) => {
    router.push(item.href);
    setIsOpen(false);
    setQuery("");
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            style={{ 
              position: "fixed", inset: 0, background: "rgba(10, 15, 30, 0.4)", 
              backdropFilter: "blur(12px)", zIndex: 1000 
            }} 
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            style={{ 
              position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)",
              width: "100%", maxWidth: "600px", zIndex: 1001,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: "16px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              overflow: "hidden"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
              <Search size={20} color="var(--text-muted)" style={{ marginRight: 12 }} />
              <input 
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search clients, GSTIN, PAN or actions... (Cmd+K)"
                style={{ 
                  flex: 1, background: "none", border: "none", outline: "none",
                  fontSize: 16, color: "var(--text-primary)"
                }}
              />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {loading && <div className="typing-dot" style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent-blue)" }} />}
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ 
                    background: "var(--bg-secondary)", border: "1px solid var(--border)", 
                    borderRadius: "6px", padding: "2px 6px", fontSize: 11, color: "var(--text-muted)" 
                  }}
                >
                  ESC
                </button>
              </div>
            </div>

            <div style={{ maxHeight: "400px", overflowY: "auto", padding: "8px" }}>
              {query === "" ? (
                <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)" }}>
                   <Command size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                   <p style={{ fontSize: 13 }}>Type to search anything in CA-OS...</p>
                </div>
              ) : results.length === 0 && !loading ? (
                <div style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                   <p>No results found for &quot;{query}&quot;</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {results.map((item, idx) => (
                    <div 
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{ 
                        padding: "12px 16px", borderRadius: "10px", cursor: "pointer",
                        background: selectedIndex === idx ? "rgba(59, 130, 246, 0.1)" : "transparent",
                        display: "flex", alignItems: "center", gap: 14,
                        transition: "all 0.1s"
                      }}
                    >
                      <div style={{ 
                        width: 36, height: 36, borderRadius: 8, 
                        background: item.type === 'action' ? "rgba(139, 92, 246, 0.1)" : "rgba(255,255,255,0.05)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                      }}>
                        {item.type === 'action' ? <item.icon size={18} color="var(--accent-purple)" /> : <User size={18} color="var(--text-muted)" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: selectedIndex === idx ? "var(--accent-blue)" : "var(--text-primary)" }}>{item.title}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.subtitle || item.type.toUpperCase()}</div>
                      </div>
                      {selectedIndex === idx && <ArrowRight size={14} color="var(--accent-blue)" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ padding: "12px 20px", background: "var(--bg-secondary)", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
               <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--text-muted)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><kbd style={{ background: "var(--border)", padding: "2px 4px", borderRadius: 4 }}>↑↓</kbd> Navigate</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><kbd style={{ background: "var(--border)", padding: "2px 4px", borderRadius: 4 }}>Enter</kbd> Select</span>
               </div>
               <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Zap size={10} color="var(--accent-amber)" /> Powered by CA-OS Intelligence
               </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
