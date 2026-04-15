import { NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { ok } from "@/lib/api";

export async function POST(_req: NextRequest) {
  const response = ok({ message: "Logged out successfully." });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
