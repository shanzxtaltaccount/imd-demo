"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

type Step = "email" | "otp" | "password";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "PASSWORD_RESET" }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      setStep("otp");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) { setError("Enter the 6-digit OTP."); return; }
    setStep("password");
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp, newPassword }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      router.push("/login?reset=1");
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="dept-name">Government of India</div>
          <div className="app-title">IMD Store Log</div>
          <div className="app-subtitle">
            {step === "email" && "Password Recovery"}
            {step === "otp"  && "Enter OTP"}
            {step === "password" && "Set New Password"}
          </div>
        </div>

        <div className="divider" />

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
          {(["email", "otp", "password"] as Step[]).map((s, i) => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: step === s ? "var(--accent)" :
                (["email","otp","password"].indexOf(step) > i ? "var(--navy-500)" : "var(--navy-700)"),
              transition: "background 0.2s",
            }} />
          ))}
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 14 }}>{error}</div>}

        {step === "email" && (
          <form onSubmit={sendOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">Your Email Address</label>
              <input
                type="email" className="form-input"
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@imd.gov.in" required disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ justifyContent: "center", padding: "10px" }}>
              {loading ? "Sending OTP…" : "Send OTP"}
            </button>
            <a href="/login" style={{ textAlign: "center", fontSize: "0.78rem", color: "var(--text-muted)", textDecoration: "none" }}>
              ← Back to Login
            </a>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOtp} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", margin: 0 }}>
              OTP sent to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">6-Digit OTP</label>
              <input
                className="form-input"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000" maxLength={6} required
                style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", letterSpacing: "0.3em", textAlign: "center" }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ justifyContent: "center", padding: "10px" }}>
              Verify OTP
            </button>
            <button type="button" className="btn btn-ghost"
              style={{ justifyContent: "center", fontSize: "0.78rem" }}
              onClick={() => { setStep("email"); setOtp(""); }}>
              ← Resend OTP
            </button>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={resetPassword} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password" className="form-input"
                value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters" required minLength={8} disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                type="password" className="form-input"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password" required disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}
              style={{ justifyContent: "center", padding: "10px" }}>
              {loading ? "Resetting…" : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
