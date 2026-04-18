"use client";

import { useState, useEffect, FormEvent } from "react";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
}

function AdminContent() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toggleTarget, setToggleTarget] = useState<User | null>(null);

  // Step 1 form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Step 2 OTP state
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch { toast("Failed to load users.", "error"); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchUsers(); }, []); // eslint-disable-line

  function resetForm() {
    setName(""); setEmail(""); setPassword(""); setRole("STAFF");
    setFormError(""); setOtp(""); setOtpError(""); setStep(1);
    setShowForm(false);
  }

  // Step 1: create inactive user + send OTP
  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();
      if (!data.success) { setFormError(data.error); return; }
      // Move to OTP step
      setStep(2);
    } catch { setFormError("Network error."); }
    finally { setFormLoading(false); }
  }

  // Step 2: confirm OTP to activate account
  async function handleOtpConfirm(e: FormEvent) {
    e.preventDefault();
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/admin/users/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!data.success) { setOtpError(data.error); return; }
      toast(`User ${name} created and verified successfully.`, "success");
      resetForm();
      fetchUsers();
    } catch { setOtpError("Network error."); }
    finally { setOtpLoading(false); }
  }

  async function handleResendOtp() {
    setResending(true);
    setOtpError("");
    try {
      await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "EMAIL_VERIFY" }),
      });
      toast("OTP resent.", "success");
    } catch { setOtpError("Failed to resend OTP."); }
    finally { setResending(false); }
  }

  async function toggleActive(user: User) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!data.success) { toast(data.error, "error"); return; }
      toast(`${user.name} ${user.isActive ? "deactivated" : "activated"}.`);
      fetchUsers();
    } catch { toast("Failed to update user.", "error"); }
    finally { setToggleTarget(null); }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <div className="subtitle">{users.length} user{users.length !== 1 ? "s" : ""} registered</div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New User
        </button>
      </div>

      <div className="page-body">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Email Verified</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr className="loading-row"><td colSpan={7}>Loading…</td></tr>
              ) : users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>{user.name}</td>
                  <td className="td-mono" style={{ fontSize: "0.75rem" }}>{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === "ADMIN" ? "badge-amber" : "badge-blue"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.emailVerified
                      ? <span className="badge badge-green">Verified</span>
                      : <span className="badge badge-gray">Pending</span>}
                  </td>
                  <td>
                    <span className={`badge ${user.isActive ? "badge-green" : "badge-red"}`}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="td-mono" style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    {new Date(user.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <button
                      className={`btn btn-sm ${user.isActive ? "btn-danger" : "btn-secondary"}`}
                      onClick={() => setToggleTarget(user)}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal — Step 1: Create User */}
      {showForm && step === 1 && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="btn btn-ghost btn-sm" onClick={resetForm}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {formError && <div className="alert alert-error">{formError}</div>}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={name}
                    onChange={e => setName(e.target.value)} placeholder="e.g. Rajesh Kumar"
                    required maxLength={100} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-input" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="user@imd.gov.in"
                    required />
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Initial Password *</label>
                    <input type="password" className="form-input" value={password}
                      onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters"
                      required minLength={8} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={role}
                      onChange={e => setRole(e.target.value as "ADMIN" | "STAFF")}>
                      <option value="STAFF">Staff</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  A 6-digit OTP will be sent to the user's email. The account activates only after OTP is verified.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? "Sending OTP…" : "Send OTP & Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal — Step 2: Enter OTP */}
      {showForm && step === 2 && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Verify Email</h2>
            </div>
            <form onSubmit={handleOtpConfirm}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {otpError && <div className="alert alert-error">{otpError}</div>}
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  An OTP was sent to{" "}
                  <strong style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{email}</strong>.
                  Enter it below to activate the account.
                </p>
                <div className="form-group">
                  <label className="form-label">6-Digit OTP</label>
                  <input
                    className="form-input"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    required
                    autoFocus
                    style={{ fontFamily: "var(--font-mono)", fontSize: "1.4rem", letterSpacing: "0.3em", textAlign: "center" }}
                  />
                </div>
                <button type="button" className="btn btn-ghost"
                  style={{ justifyContent: "center", fontSize: "0.78rem" }}
                  onClick={handleResendOtp} disabled={resending}>
                  {resending ? "Resending…" : "Resend OTP"}
                </button>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={otpLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={otpLoading || otp.length !== 6}>
                  {otpLoading ? "Verifying…" : "Verify & Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toggleTarget && (
        <ConfirmDialog
          message={`Are you sure you want to ${toggleTarget.isActive ? "deactivate" : "activate"} ${toggleTarget.name}? ${toggleTarget.isActive ? "They will no longer be able to log in." : "They will be able to log in again."}`}
          confirmLabel={toggleTarget.isActive ? "Deactivate" : "Activate"}
          danger={toggleTarget.isActive}
          onConfirm={() => toggleActive(toggleTarget)}
          onCancel={() => setToggleTarget(null)}
        />
      )}
    </>
  );
}

export default function AdminPage() {
  return (
    <ToastProvider>
      <AdminContent />
    </ToastProvider>
  );
}