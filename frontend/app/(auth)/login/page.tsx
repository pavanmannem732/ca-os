"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import api from "@/lib/api/client";
import { useAuthStore } from "@/lib/stores/authStore";

const mobileSchema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
});
const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be exactly 6 digits").regex(/^\d+$/, "OTP must be numeric"),
});

type MobileForm = z.infer<typeof mobileSchema>;
type OTPForm = z.infer<typeof otpSchema>;

export default function LoginPage() {
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const mobileForm = useForm<MobileForm>({ resolver: zodResolver(mobileSchema) });
  const otpForm = useForm<OTPForm>({ resolver: zodResolver(otpSchema) });

  const onRequestOtp = async (data: MobileForm) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/request-otp", { mobile: data.mobile });
      setMobile(data.mobile);
      setMaskedMobile(res.data.data.masked_mobile);
      setStep("otp");
      toast.success("OTP sent successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (data: OTPForm) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { mobile, otp: data.otp });
      const { access_token, user } = res.data.data;
      setAuth(user, access_token);
      toast.success(`Welcome back, ${user.full_name}!`);
      router.replace("/dashboard");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Incorrect OTP";
      const remaining = err.response?.data?.details?.attempts_remaining;
      toast.error(remaining !== undefined ? `${msg} (${remaining} attempts left)` : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-primary)" }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        style={{ width: "100%", maxWidth: 420 }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "var(--accent-blue)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 22, margin: "0 auto 16px" }}>CA</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Welcome to CA-OS</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Sign in to your CA firm account</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          <AnimatePresence mode="wait">
            {step === "mobile" ? (
              <motion.div key="mobile" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
                <form onSubmit={mobileForm.handleSubmit(onRequestOtp)}>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Enter your mobile number</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>We&apos;ll send a 6-digit OTP to verify your identity</p>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label>Mobile Number</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>+91</span>
                      <input
                        {...mobileForm.register("mobile")}
                        className={`input ${mobileForm.formState.errors.mobile ? "input-error" : ""}`}
                        style={{ paddingLeft: 44 }}
                        placeholder="9876543210"
                        type="tel"
                        maxLength={10}
                        autoFocus
                      />
                    </div>
                    {mobileForm.formState.errors.mobile && (
                      <p style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 6 }}>{mobileForm.formState.errors.mobile.message}</p>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15 }} disabled={loading}>
                    {loading ? "Sending..." : "Send OTP →"}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div key="otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <form onSubmit={otpForm.handleSubmit(onVerifyOtp)}>
                  <div style={{ marginBottom: 24 }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }}>Enter the OTP</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Sent to <strong style={{ color: "var(--text-primary)" }}>{maskedMobile}</strong></p>
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label>6-Digit OTP</label>
                    <input
                      {...otpForm.register("otp")}
                      className={`input font-mono ${otpForm.formState.errors.otp ? "input-error" : ""}`}
                      placeholder="• • • • • •"
                      type="text"
                      maxLength={6}
                      style={{ fontSize: 24, letterSpacing: 8, textAlign: "center" }}
                      autoFocus
                    />
                    {otpForm.formState.errors.otp && (
                      <p style={{ color: "var(--accent-red)", fontSize: 12, marginTop: 6 }}>{otpForm.formState.errors.otp.message}</p>
                    )}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 15, marginBottom: 12 }} disabled={loading}>
                    {loading ? "Verifying..." : "Verify & Sign In →"}
                  </button>
                  <button type="button" onClick={() => setStep("mobile")} className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                    ← Change mobile number
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 24 }}>
          Don&apos;t have an account?{" "}
          <a href="/register" style={{ color: "var(--accent-blue)" }}>Register your CA firm</a>
        </p>
      </motion.div>
    </div>
  );
}
