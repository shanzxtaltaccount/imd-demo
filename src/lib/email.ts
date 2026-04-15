const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@shantests.in";
const APP_NAME = "IMD Store Log";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: `${APP_NAME} <${FROM_EMAIL}>`, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[Resend Error]", err);
    throw new Error("Failed to send email");
  }

  return res.json();
}

export function otpEmailHtml(otp: string, purpose: "verify" | "reset", name: string) {
  const title = purpose === "verify" ? "Verify Your Email" : "Reset Your Password";
  const message =
    purpose === "verify"
      ? "Use the OTP below to verify your email address."
      : "Use the OTP below to reset your password. It expires in 10 minutes.";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#07111f;font-family:'IBM Plex Sans',Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#0d1b2e;border:1px solid #1a3357;border-radius:4px;overflow:hidden;">
    <div style="padding:20px 28px;border-bottom:1px solid #1a3357;">
      <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#f59e0b;font-family:monospace;">
        GOVERNMENT OF INDIA · IMD
      </p>
      <p style="margin:6px 0 0;font-size:16px;font-weight:600;color:#e8f1fa;">IMD Store Log System</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 8px;font-size:18px;font-weight:600;color:#e8f1fa;">${title}</p>
      <p style="margin:0 0 24px;font-size:14px;color:#8aacc8;">Hello ${name}, ${message}</p>
      <div style="background:#07111f;border:1px solid #1a3357;border-radius:4px;padding:20px;text-align:center;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#4d7191;font-family:monospace;">Your OTP</p>
        <p style="margin:0;font-size:36px;font-weight:600;letter-spacing:0.2em;color:#f59e0b;font-family:monospace;">${otp}</p>
      </div>
      <p style="margin:0;font-size:12px;color:#4d7191;">
        This OTP is valid for <strong style="color:#8aacc8;">10 minutes</strong>. Do not share it with anyone.<br>
        If you did not request this, please ignore this email.
      </p>
    </div>
    <div style="padding:14px 28px;border-top:1px solid #1a3357;background:#07111f;">
      <p style="margin:0;font-size:11px;color:#4d7191;font-family:monospace;">
        RESTRICTED · INDIAN METEOROLOGICAL DEPARTMENT
      </p>
    </div>
  </div>
</body>
</html>`;
}
