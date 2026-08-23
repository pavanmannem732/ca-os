"use client";
import { useEffect, useState, useRef } from "react";
import { useAuthStore } from "@/lib/stores/authStore";
import { 
  Search, Send, Phone, Video, 
  MoreVertical, Paperclip, Smile, 
  CheckCheck, User, Bot, Zap
} from "lucide-react";
import api from "@/lib/api/client";

const FormattedMessage = ({ text }: { text: string }) => {
  if (!text) return null;
  
  // Basic markdown-like formatter
  const lines = text.split('\n');
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {lines.map((line, i) => {
        // Handle bolding: **text**
        const parts = line.split(/(\*\*.*?\*\*)/g);
        
        return (
          <p key={i} style={{ fontSize: "14.5px", lineHeight: "1.6", margin: 0 }}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      })}
    </div>
  );
};

export default function WhatsAppPage() {
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const [selectedChat, setSelectedChat] = useState(0);
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = () => setIsResizing(true);
  const stopResizing = () => setIsResizing(false);
  const resize = (e: MouseEvent) => {
    if (isResizing) {
      const newWidth = e.clientX - 260; // 260 is the main sidebar width
      if (newWidth > 200 && newWidth < 600) {
        setSidebarWidth(newWidth);
      }
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [chats, setChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    fetchMessages();
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//localhost:8000/ws/${user?.firm_id}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_whatsapp_message") {
        setMessages(prev => [...prev, data.message]);
      }
    };
    return () => ws.close();
  }, [selectedChat, user?.firm_id, chats]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingChats(true);
    try {
      // Fetch both conversations and all clients
      const [convoRes, clientRes] = await Promise.all([
        api.get("/chat/conversations"),
        api.get("/clients/?limit=100")
      ]);
      
      const convos = convoRes.data.data || [];
      const allClients = clientRes.data.data || [];
      
      // Create a map of existing conversations by client_id
      const convoMap = new Map<string, any>(convos.map((c: any) => [c.client_id, c]));
      
      // Merge: Every client should have a row
      const merged = allClients.map((client: any) => {
        const existingConvo = convoMap.get(client.id);
        return {
          id: existingConvo?.id, // Might be undefined if no chat yet
          client_id: client.id,
          client: {
            name: client.name,
            status: client.status || "active"
          },
          last_message_body: existingConvo?.last_message_body || "Start a new conversation...",
          last_message_at: existingConvo?.last_message_at,
          unread_count: existingConvo?.unread_count || 0
        };
      });
      
      setChats(merged);
      return merged;
    } catch (err) {
      console.error("Failed to fetch data:", err);
      return [];
    } finally {
      setLoadingChats(false);
    }
  };

  const fetchMessages = async (explicitConvoId?: string) => {
    const convoId = explicitConvoId || chats[selectedChat]?.id;
    if (!convoId) {
      setMessages([
        { id: "1", body: "Hello! We got a GST demand notice for the October period. Could you please check?", direction: "inbound", timestamp: new Date().toISOString() },
        { id: "2", body: "Sure, Ravi. I've received the notice. My AI assistant is drafting a technical response based on your purchase register. I'll share it with you shortly.", direction: "outbound", timestamp: new Date().toISOString() }
      ]);
      return;
    }
    try {
      const res = await api.get(`/chat/conversations/${convoId}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const clientId = chats[selectedChat]?.client_id;
    if (!clientId) return;
    
    const messageBody = message.trim();
    setMessage("");
    setIsSending(true);

    // 1. Optimistically add the inbound message to the UI
    const tempMsg = {
      id: "temp-" + Date.now(),
      body: messageBody,
      direction: "inbound",
      timestamp: new Date().toISOString(),
      status: "sending"
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      await api.post("/chat/send", { body: messageBody, client_id: clientId });
      const mergedChats = await fetchData(); 
      const convoId = mergedChats[selectedChat]?.id;
      if (convoId) {
        await fetchMessages(convoId);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveDraft = async () => {
    const draftText = "I've drafted a response based on the notice mentioned. Would you like to review and send it?";
    // In a real app, we'd get the actual draft body from state
    const clientId = chats[selectedChat]?.client_id;
    if (!clientId) return;

    setIsSending(true);
    try {
      await api.post("/chat/send", { body: draftText, client_id: clientId });
      await fetchData();
    } catch (err) {
      console.error("Failed to approve draft:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsSending(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("client_id", chats[selectedChat]?.client_id);
      await api.post("/chat/upload", formData);
      fetchMessages();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setIsSending(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const emojis = [
    "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "☹️", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🫡", "🤭", "🫢", "🤫", "🤥", "😶", "😐", "😑", "😬", "🫠", "🙄", "😯", "😦", "😧", "😮", "😲", "🥱", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "👍", "👎", "👊", "✊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🙏", "✍️", "💪", "🦾", "🦵", "🦿", "👀", "👁️", "👅", "👄", "🧠", "🫀", "🫁", "🦷", "🦴", "👶", "🧒", "👦", "👧", "🧑", "👨", "👩", "🧔", "👵", "👴", "👮", "🕵️", "👷", "💂", "🥷", "👩‍⚕️", "👨‍💻", "👨‍🏫", "👨‍🍳", "👨‍🚀", "🧙", "🧛", "🧟", "🧞", "🧜", "🧚", "👑", "🎩", "👒", "🧢", "👓", "🕶️", "🥽", "👔", "👕", "👗", "👘", "🥻", "👠", "👟", "🧦", "🧤", "🧣", "🎒", "👜", "💼", "👛", "💍", "💎", "🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🐔", "🐧", "🐦", "🐤", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🪲", "🐢", "🐍", "🦕", "🦖", "🐙", "🦑", "🦞", "🦀", "🐬", "🐳", "🦈", "🌍", "🌎", "🌏", "🌕", "🌖", "🌗", "🌘", "🌑", "⭐", "🌟", "✨", "⚡", "☄️", "💥", "🔥", "🌈", "☀️", "⛅", "☁️", "🌧️", "⛈️", "❄️", "☃️", "🌊", "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🫐", "🍒", "🍍", "🥭", "🍅", "🥑", "🥦", "🥕", "🌽", "🍔", "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥗", "🍝", "🍜", "🍣", "🍩", "🍪", "🎂", "🍫", "🍿", "☕", "🍵", "🧃", "🍺", "🍷", "🍸", "🍾", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥊", "🥋", "🎮", "🕹️", "🎲", "🧩", "🚗", "🚕", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚜", "✈️", "🚀", "🛸", "🚁", "🚢", "⛵", "🚤", "🚲", "🛴", "🛹", "🏠", "🏢", "🏰", "🗼", "🗽", "⛪", "🕌", "🛕", "📱", "💻", "🖥️", "⌨️", "🖱️", "🖨️", "📷", "📹", "🎥", "📺", "📻", "⏰", "⌚", "🔋", "💡", "🔦", "🧯", "🛒", "💰", "💵", "💳", "📚", "✏️", "📌", "📎", "✂️", "🔒", "🔑", "🛠️", "⚙️", "🧲", "🧪", "💊", "🚽", "🚿", "🛏️", "🧸", "🎉", "🎊", "🎈", "🎁", "🪅", "🎀", "🏆", "🥇", "🥈", "🥉", "🚩", "🏳️", "🏴"
  ];

  return (
    <div style={{ 
      display: "flex", 
      height: "calc(100vh - 64px)", // 64px is TopNav height
      margin: "-24px -32px", // Counteract parent padding
      background: "var(--bg-secondary)",
      overflow: "hidden" 
    }}>
      {/* Sidebar */}
      <div style={{ 
        width: `${sidebarWidth}px`, 
        height: "100%",
        background: "var(--bg-primary)", 
        borderRight: "1px solid var(--border-subtle)", 
        display: "flex", 
        flexDirection: "column",
        position: "relative"
      }}>
        <div 
          onMouseDown={startResizing}
          style={{
            position: "absolute",
            right: "-4px",
            top: 0,
            bottom: 0,
            width: "8px",
            cursor: "col-resize",
            zIndex: 60,
            background: isResizing ? "var(--accent-blue)" : "transparent",
            transition: "background 0.2s"
          }}
        />
        <div style={{ padding: "24px", borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "16px" }}>Messages</h2>
          <div style={{ position: "relative" }}>
            <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input className="input" placeholder="Search conversations..." style={{ paddingLeft: "40px", background: "var(--bg-secondary)" }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {loadingChats ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</div>
          ) : chats.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No chats</div>
          ) : chats.map((chat, i) => (
            <div key={chat.id} onClick={() => setSelectedChat(i)} style={{ padding: "16px 24px", display: "flex", gap: "12px", cursor: "pointer", background: selectedChat === i ? "var(--accent-blue)10" : "transparent", borderLeft: selectedChat === i ? "4px solid var(--accent-blue)" : "4px solid transparent" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <User size={24} color="var(--text-muted)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>{chat.client?.name}</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{chat.last_message_at?.split("T")[1].substring(0, 5)}</span>
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{chat.last_message_body || "New conversation"}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div style={{ 
        flex: 1, 
        height: "100%",
        display: "flex", 
        flexDirection: "column", 
        background: "var(--bg-primary)" 
      }}>
        {/* Header */}
        <div style={{ padding: "16px 24px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <User size={20} />
            <div style={{ fontWeight: 600 }}>{chats[selectedChat]?.client?.name || "Select chat"}</div>
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <Phone size={20} />
            <Video size={20} />
            <MoreVertical size={20} />
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, padding: "24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "16px", background: "#f8fafc" }}>
          {messages.map((msg, i) => (
            <div 
              key={i} 
              style={{ 
                alignSelf: msg.direction.toLowerCase() === "inbound" ? "flex-start" : "flex-end", 
                maxWidth: "65%", 
                background: msg.direction.toLowerCase() === "inbound" ? "white" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", 
                color: msg.direction.toLowerCase() === "inbound" ? "#1e293b" : "white",
                padding: "10px 14px", 
                borderRadius: msg.direction.toLowerCase() === "inbound" ? "0 16px 16px 16px" : "16px 16px 0 16px", 
                boxShadow: msg.direction.toLowerCase() === "inbound" ? "0 2px 4px rgba(0,0,0,0.05)" : "0 4px 12px rgba(37, 99, 235, 0.2)",
                position: "relative",
                border: msg.direction.toLowerCase() === "inbound" ? "1px solid #e2e8f0" : "none"
              }}
            >
              <FormattedMessage text={msg.body} />
              <div style={{ 
                display: "flex", 
                justifyContent: "flex-end", 
                alignItems: "center", 
                gap: "4px", 
                marginTop: "4px",
                opacity: 0.8
              }}>
                <span style={{ fontSize: "10px" }}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                </span>
                {msg.direction.toLowerCase() === "outbound" && <CheckCheck size={14} strokeWidth={2.5} />}
              </div>
            </div>
          ))}

          {isSending && (
            <div style={{ alignSelf: "flex-start", background: "white", padding: "12px 16px", borderRadius: "0 16px 16px 16px", border: "1px solid #e2e8f0", display: "flex", gap: "4px" }}>
              <div className="typing-dot" style={{ width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%" }}></div>
              <div className="typing-dot" style={{ width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%", animationDelay: "0.2s" }}></div>
              <div className="typing-dot" style={{ width: "6px", height: "6px", background: "#3b82f6", borderRadius: "50%", animationDelay: "0.4s" }}></div>
            </div>
          )}

          <div ref={scrollRef} />
          
          {/* AI Draft Suggestion */}
          {messages.length > 0 && messages[messages.length-1].direction === "inbound" && messages[messages.length-1].body.toLowerCase().includes("notice") && (
            <div style={{ alignSelf: "flex-start", width: "100%", maxWidth: "500px", background: "white", padding: "20px", borderRadius: "16px", border: "2px dashed #3b82f6", position: "relative" }}>
              <div style={{ position: "absolute", top: "-12px", left: "20px", background: "var(--accent-blue)", color: "white", padding: "2px 12px", borderRadius: "20px", fontSize: "10px", fontWeight: 700 }}>AI DRAFT</div>
              <p style={{ fontSize: "14px", color: "#475569", marginBottom: "16px" }}>I've drafted a response based on the notice mentioned. Would you like to review and send it?</p>
              <div style={{ display: "flex", gap: "12px" }}>
                <button 
                  onClick={handleApproveDraft}
                  disabled={isSending}
                  className="btn btn-primary" 
                  style={{ flex: 1, height: "36px" }}
                >
                  <Zap size={14} /> Approve
                </button>
                <button className="btn btn-ghost" style={{ flex: 1, height: "36px", border: "1px solid #e2e8f0" }}>Edit</button>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: "20px 24px", borderTop: "1px solid var(--border-subtle)", position: "relative", background: "var(--bg-primary)" }}>
          {showEmojiPicker && (
            <div 
              className="emoji-picker"
              style={{ 
                position: "absolute", 
                bottom: "calc(100% + 10px)", 
                left: "24px", 
                background: "rgba(255, 255, 255, 0.95)", 
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(226, 232, 240, 0.8)", 
                borderRadius: "20px", 
                padding: "16px", 
                display: "grid", 
                gridTemplateColumns: "repeat(8, 1fr)",
                gap: "8px", 
                boxShadow: "0 20px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.02)", 
                zIndex: 100,
                width: "360px",
                height: "320px",
                overflowY: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}
            >
              {emojis.map(e => (
                <button 
                  key={e} 
                  onClick={() => addEmoji(e)} 
                  style={{ 
                    fontSize: "24px", 
                    width: "40px",
                    height: "40px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    borderRadius: "12px",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f1f5f9";
                    e.currentTarget.style.transform = "scale(1.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "none";
                    e.currentTarget.style.transform = "scale(1)";
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}
          <div style={{ background: "white", borderRadius: "16px", padding: "8px 16px", display: "flex", alignItems: "center", gap: "12px", border: "1px solid #e2e8f0" }}>
            <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Smile size={20} /></button>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><Paperclip size={20} /></button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: "none" }} />
            <input 
              style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: "#1e293b" }} 
              placeholder="Type a message..." 
              value={message} 
              autoFocus
              onChange={e => setMessage(e.target.value)} 
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }} 
            />
            <button onClick={handleSend} disabled={isSending} style={{ background: "var(--accent-blue)", color: "white", border: "none", borderRadius: "12px", width: "40px", height: "40px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Send size={18} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
