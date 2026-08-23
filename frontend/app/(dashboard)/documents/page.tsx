"use client";
import { useState, useEffect } from "react";
import {
  File, Folder, Search, Filter,
  Upload, Download, Trash2,
  Eye, FileText, FileImage,
  Shield, Clock, MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import api from "@/lib/api/client";
import { X, Check } from "lucide-react";

export default function DocumentsPage() {
  const [view, setView] = useState<"grid" | "list">("list");
  const [documents, setDocuments] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<any[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isFolderOpen, setIsFolderOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState({ client_id: "", category: "invoice" });
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchContent();
    fetchClients();
  }, [currentFolderId]);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const res = await api.get("/documents", { params: { parent_id: currentFolderId } });
      setDocuments(res.data.data?.documents || []);
      setFolders(res.data.data?.folders || []);
    } catch { toast.error("Failed to load content"); }
    finally { setLoading(false); }
  };

  const fetchClients = async () => {
    try {
      const res = await api.get("/clients");
      setClients(res.data.data);
    } catch { console.error("Failed to load clients"); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadData.client_id) {
      toast.error("Please select a file and client");
      return;
    }

    const toastId = toast.loading(`Uploading ${uploadFile.name}...`);
    try {
      // 1. Get presigned URL
      const resUrl = await api.post("/documents/upload-url", {
        file_name: uploadFile.name,
        file_size: uploadFile.size,
        file_type: uploadFile.type,
        client_id: uploadData.client_id,
        document_category: uploadData.category
      });

      const { upload_url, s3_key, s3_bucket } = resUrl.data.data;

      // 2. Upload to S3 (Mocking for dev if URL is mock-s3)
      if (!upload_url.includes("mock-s3")) {
        await fetch(upload_url, {
          method: "PUT",
          body: uploadFile,
          headers: { "Content-Type": uploadFile.type }
        });
      }

      // 3. Create DB record
      await api.post("/documents", {
        file_name: uploadFile.name,
        file_size_bytes: uploadFile.size,
        file_type: uploadFile.type,
        s3_key,
        s3_bucket,
        client_id: uploadData.client_id,
        document_category: uploadData.category,
        folder_id: currentFolderId
      });

      toast.success("File uploaded successfully", { id: toastId });
      setIsUploadOpen(false);
      setUploadFile(null);
      fetchContent();
    } catch (err) {
      toast.error("Upload failed", { id: toastId });
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.post("/documents/folders", {
        name: newFolderName,
        parent_id: currentFolderId,
        client_id: uploadData.client_id || null // Optional: link to client if specified
      });
      toast.success("Folder created");
      setIsFolderOpen(false);
      setNewFolderName("");
      fetchContent();
    } catch { toast.error("Failed to create folder"); }
  };

  const handleDownload = async (doc: any) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download-url`);
      const { download_url } = res.data.data;
      if (download_url.includes("mock-s3")) {
        toast.info("Downloading from mock storage...");
      } else {
        window.open(download_url, "_blank");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to get download link";
      toast.error(msg);
    }
  };

  const handlePreview = async (doc: any) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download-url`);
      const { download_url } = res.data.data;
      if (download_url.includes("mock-s3")) {
        toast.info(`Previewing ${doc.file_name} (Mock)`);
      } else {
        window.open(download_url, "_blank");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to preview document";
      toast.error(msg);
    }
  };

  const handleDelete = async (doc: any) => {
    const toastId = toast.loading(`Deleting ${doc.file_name || "document"}...`);
    try {
      await api.delete(`/documents/${doc.id}`);
      toast.success("Document deleted", { id: toastId });
      fetchContent();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || err.response?.data?.detail?.[0]?.msg || JSON.stringify(err.response?.data) || err.message || "Failed to delete document";
      toast.error(typeof msg === 'string' ? msg.substring(0, 100) : "Failed to delete", { id: toastId });
    }
  };

  const openFolder = (folder: any) => {
    setBreadcrumb([...breadcrumb, folder]);
    setCurrentFolderId(folder.id);
  };

  const navigateTo = (index: number) => {
    if (index === -1) {
      setBreadcrumb([]);
      setCurrentFolderId(null);
    } else {
      const newBreadcrumb = breadcrumb.slice(0, index + 1);
      setBreadcrumb(newBreadcrumb);
      setCurrentFolderId(newBreadcrumb[newBreadcrumb.length - 1].id);
    }
  };

  return (
    <div style={{ padding: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: 700, marginBottom: "4px" }}>Document Center</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Secure cloud storage for all client compliance files and audit evidence.</p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={() => setIsFolderOpen(true)} className="btn btn-ghost" style={{ border: "1px solid var(--border-subtle)", gap: "8px" }}>
            <Folder size={18} /> New Folder
          </button>
          <button onClick={() => setIsUploadOpen(true)} className="btn btn-primary" style={{ gap: "8px" }}>
            <Upload size={18} /> Upload Files
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isUploadOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsUploadOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="card"
              style={{ position: "fixed", top: "15%", left: "50%", transform: "translateX(-50%)", width: "450px", background: "var(--bg-card)", zIndex: 101, padding: "32px", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: 700 }}>Upload Document</h3>
                <button onClick={() => setIsUploadOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
              </div>
              <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div className="form-group">
                  <label className="label">Target Client *</label>
                  <select className="input" required value={uploadData.client_id} onChange={e => setUploadData({ ...uploadData, client_id: e.target.value })}>
                    <option value="">Select a client...</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">Category</label>
                  <select className="input" value={uploadData.category} onChange={e => setUploadData({ ...uploadData, category: e.target.value })}>
                    <option value="invoice">Invoice</option>
                    <option value="bank_statement">Bank Statement</option>
                    <option value="gst_return">GST Return</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div
                  style={{ border: "2px dashed var(--border)", borderRadius: "12px", padding: "32px", textAlign: "center", cursor: "pointer", background: uploadFile ? "var(--accent-blue)05" : "transparent" }}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input type="file" id="file-input" hidden onChange={e => setUploadFile(e.target.files?.[0] || null)} />
                  {uploadFile ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <Check size={24} color="var(--accent-green)" />
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{uploadFile.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <Upload size={24} color="var(--text-muted)" />
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>Click or drag to upload</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>PDF, Images, Excel (Max 25MB)</div>
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: "48px", fontWeight: 700 }}>Start Upload</button>
              </form>
            </motion.div>
          </>
        )}

        {isFolderOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsFolderOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="card"
              style={{ position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)", width: "400px", background: "var(--bg-card)", zIndex: 101, padding: "32px", border: "1px solid var(--border)" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px" }}>New Folder</h3>
              <form onSubmit={handleCreateFolder}>
                <input className="input" required value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder Name" style={{ marginBottom: "24px" }} />
                <div style={{ display: "flex", gap: "12px" }}>
                  <button type="button" onClick={() => setIsFolderOpen(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Create</button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Storage Overview */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "32px" }}>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--accent-blue)15", color: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>2.4 GB</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Total Storage Used</div>
          </div>
        </div>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--accent-green)15", color: "var(--accent-green)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FileText size={24} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>842</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Compliance Files</div>
          </div>
        </div>
        <div className="card" style={{ padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "var(--accent-orange)15", color: "var(--accent-orange)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 700 }}>12</div>
            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>Pending Verification</div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px", fontSize: "14px", color: "var(--text-muted)" }}>
        <button onClick={() => navigateTo(-1)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: currentFolderId === null ? "var(--text-primary)" : "var(--accent-blue)", fontWeight: currentFolderId === null ? 700 : 500 }}>Root</button>
        {breadcrumb.map((f, i) => (
          <div key={f.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>/</span>
            <button onClick={() => navigateTo(i)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: i === breadcrumb.length - 1 ? "var(--text-primary)" : "var(--accent-blue)", fontWeight: i === breadcrumb.length - 1 ? 700 : 500 }}>{f.name}</button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input className="input" placeholder="Search by document name, client, or tags..." style={{ paddingLeft: "44px" }} />
        </div>
        <button className="btn btn-ghost" style={{ border: "1px solid var(--border-subtle)" }}><Filter size={18} /></button>
      </div>

      {/* File List */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Name</th>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Client</th>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Size</th>
              <th style={{ textAlign: "left", padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)", fontWeight: 500 }}>Modified</th>
              <th style={{ width: "100px" }}></th>
            </tr>
          </thead>
          <tbody>
            {folders?.map(f => (
              <tr key={f.id} className="table-row" style={{ borderBottom: "1px solid var(--border-subtle)", cursor: "pointer" }} onClick={() => openFolder(f)}>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--accent-blue)10", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Folder size={18} color="var(--accent-blue)" />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{f.name}</div>
                  </div>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "13px" }}>-</td>
                <td style={{ padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)" }}>-</td>
                <td style={{ padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)" }}>{new Date(f.created_at).toLocaleDateString()}</td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <MoreVertical size={16} color="var(--text-muted)" />
                </td>
              </tr>
            ))}
            {documents?.length > 0 ? documents.map((file, i) => (
              <tr key={i} className="table-row" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "16px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {file.file_type?.includes("pdf") ? <FileText size={18} color="#ef4444" /> : file.file_type?.includes("sheet") || file.file_type?.includes("excel") ? <File size={18} color="#22c55e" /> : <FileImage size={18} color="#3b82f6" />}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{file.file_name}</div>
                  </div>
                </td>
                <td style={{ padding: "16px 24px", fontSize: "13px" }}>{clients.find(c => c.id === file.client_id)?.name || "External Client"}</td>
                <td style={{ padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)" }}>{(file.file_size_bytes / 1024 / 1024).toFixed(2)} MB</td>
                <td style={{ padding: "16px 24px", fontSize: "13px", color: "var(--text-muted)" }}>{new Date(file.created_at).toLocaleDateString()}</td>
                <td style={{ padding: "16px 24px", textAlign: "right" }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      onClick={() => handlePreview(file)}
                      className="btn btn-ghost"
                      style={{ padding: "6px" }}
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      className="btn btn-ghost"
                      style={{ padding: "6px" }}
                      title="Download"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="btn btn-ghost"
                      style={{ padding: "6px", color: "var(--accent-red)" }}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5} style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
                  {loading ? "Loading documents..." : "No documents found. Upload your first file to get started."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
