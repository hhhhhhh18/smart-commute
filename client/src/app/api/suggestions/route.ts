import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  try {
    const { name, email, suggestion, rating } = await req.json();

    // Only the suggestion text is required
    if (!suggestion?.trim()) {
      return NextResponse.json({ error: "Suggestion text is required" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const displayName  = name?.trim()  || "Anonymous";
    const displayEmail = email?.trim() || "Not provided";

    // ── Email to you ──────────────────────────────────────────────────────────
    await transporter.sendMail({
      from:    `"SmartCommute Feedback" <${process.env.SMTP_USER}>`,
      to:      "shaikhamad67612@gmail.com",
      subject: `💡 New App Suggestion from ${displayName}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
          <div style="background:#1565C0;color:white;padding:20px 24px;border-radius:8px;margin-bottom:24px">
            <h2 style="margin:0;font-size:20px">💡 New Suggestion — SmartCommute</h2>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600;width:100px">From</td>
              <td style="padding:10px 0;font-size:14px;color:#1a1a1a;font-weight:700">${displayName}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600">Email</td>
              <td style="padding:10px 0;font-size:14px;color:#1565C0">
                ${email?.trim() ? `<a href="mailto:${email}" style="color:#1565C0">${email}</a>` : "Not provided"}
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600">Date</td>
              <td style="padding:10px 0;font-size:14px;color:#1a1a1a">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
            </tr>
            <tr>
  <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600">
    Rating
  </td>
  <td style="padding:10px 0;font-size:14px;color:#1a1a1a;font-weight:700">
    ${rating ? `${"⭐".repeat(rating)} (${rating}/5)` : "Not Provided"}
  </td>
</tr>
          </table>

          <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px">
            <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Suggestion</div>
            <div style="font-size:15px;color:#1a1a1a;line-height:1.7;white-space:pre-wrap">${suggestion}</div>
          </div>

          <div style="font-size:12px;color:#94a3b8;text-align:center">
            Sent from SmartCommute Hyderabad
          </div>
        </div>
      `,
    });

    // ── Confirmation email to user (only if they provided an email) ───────────
    if (
      email?.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      await transporter.sendMail({
        from:    `"SmartCommute" <${process.env.SMTP_USER}>`,
        to:      email.trim(),
        subject: "Thanks for your suggestion! 🚌",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0">
            <div style="background:#1565C0;color:white;padding:20px 24px;border-radius:8px;margin-bottom:24px;text-align:center">
              <div style="font-size:32px;margin-bottom:8px">🚌</div>
              <h2 style="margin:0;font-size:18px">SmartCommute Hyderabad</h2>
            </div>
            <h3 style="color:#1a1a1a;margin:0 0 12px">Hey ${displayName}, thanks for the feedback!</h3>
            <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 20px">
              We've received your suggestion and will review it shortly. Your input helps make SmartCommute better for everyone in Hyderabad.
            </p>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-bottom:20px">
              <div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px">Your message</div>
              <div style="font-size:13px;color:#555;line-height:1.6;white-space:pre-wrap">${suggestion}</div>
            </div>
            <p style="color:#94a3b8;font-size:12px;text-align:center;margin:0">
              SmartCommute · Hyderabad &nbsp;·&nbsp; <a href="mailto:shaikhamad67612@gmail.com" style="color:#1565C0">shaikhamad67612@gmail.com</a>
            </p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Suggestion API]", err);
    return NextResponse.json({ error: "Failed to send suggestion" }, { status: 500 });
  }
}