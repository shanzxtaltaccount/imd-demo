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

  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

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
      toast(`User ${name} created. Verification email sent.`);
      setShowForm(false);
      setName(""); setEmail(""); setPassword(""); setRole("STAFF");
      fetchUsers();
    } catch { setFormError("Network error."); }
    finally { setFormLoading(false); }
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
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
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

      {/* Create user modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
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
                  A verification OTP will be sent to the user's email after creation.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary"
                  onClick={() => setShowForm(false)} disabled={formLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? "Creating…" : "Create User"}
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
