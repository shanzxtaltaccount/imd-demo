"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function VerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const emailParam = params.get("email") ?? "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (emailParam) sendOtp(emailParam);
  }, []); // eslint-disable-line

  async function sendOtp(to: string) {
    setSending(true);
    await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: to, type: "EMAIL_VERIFY" }),
    });
    setSending(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error); return; }
      setSuccess(true);
      setTimeout(() => router.push("/login?verified=1"), 2000);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-box" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>✓</div>
          <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>Email Verified</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Redirecting to dashboard…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="dept-name">Government of India</div>
          <div className="app-title">Verify Email</div>
          <div className="app-subtitle">IMD Store Log System</div>
        </div>
        <div className="divider" />

        {sending && <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 14 }}>Sending OTP…</p>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && <div className="alert alert-error">{error}</div>}

          {!emailParam && (
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email}
                onChange={e => setEmail(e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">6-Digit OTP</label>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 6 }}>
              Sent to <strong style={{ color: "var(--text-secondary)" }}>{email}</strong>
            </p>
            <input
              className="form-input"
              value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000" maxLength={6} required
              style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", letterSpacing: "0.3em", textAlign: "center" }}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ justifyContent: "center", padding: "10px" }}>
            {loading ? "Verifying…" : "Verify Email"}
          </button>

          <button type="button" className="btn btn-ghost"
            style={{ justifyContent: "center", fontSize: "0.78rem" }}
            onClick={() => sendOtp(email)}>
            Resend OTP
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
