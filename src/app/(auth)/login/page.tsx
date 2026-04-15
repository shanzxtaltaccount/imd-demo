"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const resetSuccess = params.get("reset") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error ?? "Login failed. Please try again.");
        return;
      }

      if (data.data?.user?.emailVerified === false) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      router.push("/entries");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-logo">
          <div className="dept-name">Government of India</div>
          <div className="app-title">IMD Store Log</div>
          <div className="app-subtitle">Indian Meteorological Department</div>
        </div>

        <div className="divider" />

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {resetSuccess && (
            <div className="alert alert-success">Password reset successfully. Please log in.</div>
          )}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email" type="email" className="form-input"
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@imd.gov.in" autoComplete="email"
              required disabled={loading}
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="form-label" htmlFor="password">Password</label>
              <a href="/forgot-password" style={{
                fontSize: "0.72rem", color: "var(--text-muted)",
                textDecoration: "none", fontFamily: "var(--font-mono)",
              }}>
                Forgot password?
              </a>
            </div>
            <input
              id="password" type="password" className="form-input"
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete="current-password"
              required disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}
            style={{ marginTop: 6, justifyContent: "center", padding: "10px" }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: "center" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            RESTRICTED ACCESS — AUTHORISED PERSONNEL ONLY
          </span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
