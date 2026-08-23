"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Check, ArrowRight, ShieldCheck, Building2, User } from "lucide-react";
import api from "@/lib/api/client";

const registerSchema = z.object({
  firm_name: z.string().min(3, "Firm name must be at least 3 characters"),
  firm_type: z.enum(["sole_proprietor", "partnership", "llp", "company"]),
  icai_membership_number: z.string().min(5, "Invalid membership number"),
  full_name: z.string().min(3, "Full name is required"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().email("Enter a valid email address"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firm_type: "sole_proprietor" }
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      // In CA-OS, registration creates the firm and the first owner user
      await api.post("/auth/register", data);
      toast.success("Firm registered successfully!");
      toast.info("Please sign in with your mobile number to complete setup.");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg-primary)" }}>
      {/* Left side - Branding/Features */}
      <div style={{ flex: 1, padding: 60, display: "flex", flexDirection: "column", background: "linear-gradient(135deg, rgba(30, 64, 175, 0.1) 0%, rgba(30, 64, 175, 0) 100%)", borderRight: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 80 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "white" }}>CA</div>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>CA-OS Enterprise</span>
        </div>

        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.03em" }}>
            The AI-First Operating System for <span style={{ color: "var(--accent-blue)" }}>Modern CAs.</span>
          </h1>
          <p style={{ fontSize: 18, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 48 }}>
            Join 500+ Indian firms automating their compliance, document management, and client communication.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {[
              { icon: ShieldCheck, title: "ICAI Compliant", desc: "Built specifically for Indian regulatory standards." },
              { icon: Building2, title: "Multi-Entity Management", desc: "Handle multiple branches and departments seamlessly." },
              { icon: User, title: "Client Portal", desc: "Give your clients a premium experience they'll love." }
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent-blue)", border: "1px solid var(--border-subtle)" }}>
                  <item.icon size={24} />
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</h4>
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div style={{ flex: 1, padding: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          style={{ width: "100%", maxWidth: 480 }}
        >
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Register Your Firm</h2>
            <p style={{ color: "var(--text-secondary)" }}>Set up your CA practice in minutes.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Firm Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label>Firm Name</label>
                  <input 
                    {...register("firm_name")}
                    className={`input ${errors.firm_name ? "input-error" : ""}`}
                    placeholder="e.g., Sharma & Associates"
                  />
                  {errors.firm_name && <p className="error-text">{errors.firm_name.message}</p>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label>Firm Type</label>
                    <select {...register("firm_type")} className="input">
                      <option value="sole_proprietor">Sole Proprietor</option>
                      <option value="partnership">Partnership</option>
                      <option value="llp">LLP</option>
                      <option value="company">Company</option>
                    </select>
                  </div>
                  <div>
                    <label>ICAI Membership #</label>
                    <input 
                      {...register("icai_membership_number")}
                      className={`input ${errors.icai_membership_number ? "input-error" : ""}`}
                      placeholder="123456"
                    />
                    {errors.icai_membership_number && <p className="error-text">{errors.icai_membership_number.message}</p>}
                  </div>
                </div>
              </div>

              <hr style={{ border: "0", borderTop: "1px solid var(--border-subtle)" }} />

              {/* Owner Section */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label>Owner / Senior Partner Name</label>
                  <input 
                    {...register("full_name")}
                    className={`input ${errors.full_name ? "input-error" : ""}`}
                    placeholder="John Doe"
                  />
                  {errors.full_name && <p className="error-text">{errors.full_name.message}</p>}
                </div>

                <div>
                  <label>Mobile Number (For OTP Login)</label>
                  <input 
                    {...register("mobile")}
                    className={`input ${errors.mobile ? "input-error" : ""}`}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                  {errors.mobile && <p className="error-text">{errors.mobile.message}</p>}
                </div>

                <div>
                  <label>Work Email</label>
                  <input 
                    {...register("email")}
                    className={`input ${errors.email ? "input-error" : ""}`}
                    placeholder="john@firm.com"
                    type="email"
                  />
                  {errors.email && <p className="error-text">{errors.email.message}</p>}
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: "100%", justifyContent: "center", height: 50, fontSize: 16 }}
                disabled={loading}
              >
                {loading ? "Registering..." : "Create Firm Account"}
                {!loading && <ArrowRight size={18} style={{ marginLeft: 8 }} />}
              </button>
            </div>
          </form>

          <p style={{ textAlign: "center", marginTop: 32, color: "var(--text-muted)", fontSize: 14 }}>
            Already have an account? <a href="/login" style={{ color: "var(--accent-blue)", fontWeight: 600 }}>Sign In</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
