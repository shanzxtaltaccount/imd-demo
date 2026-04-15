import { NextResponse } from "next/server";

type ApiSuccess<T> = { success: true; data: T };
type ApiError = { success: false; error: string };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, { status });
}

export function err(message: string, status = 400) {
  return NextResponse.json<ApiError>(
    { success: false, error: message },
    { status }
  );
}

export function unauthorized() {
  return err("Unauthorized. Please log in.", 401);
}

export function forbidden() {
  return err("Forbidden. Insufficient permissions.", 403);
}

export function notFound(resource = "Resource") {
  return err(`${resource} not found.`, 404);
}

export function serverError(e?: unknown) {
  console.error("[API Error]", e);
  return err("Internal server error. Please try again.", 500);
}

// ──────────────────────────────────────────────
// Simple in-memory rate limiter (per IP, per minute)
// Sufficient for 4–5 users. For multi-instance
// deploys on Vercel, this is per-instance, which
// is acceptable for a small internal tool.
// ──────────────────────────────────────────────
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  maxRequests = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }

  if (entry.count >= maxRequests) return false; // blocked

  entry.count++;
  return true;
}
