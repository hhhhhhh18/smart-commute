import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.sendMail({
    from:    `"BusRoute App" <${process.env.SMTP_USER}>`,
    to,
    subject: "Your verification code",
    html: `
      <div style="font-family:'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8f9fa;border-radius:12px;">
        <h2 style="color:#1565C0;margin:0 0 8px;">Verify your email</h2>
        <p style="color:#555;font-size:14px;margin:0 0 24px;">Use the code below to complete your registration. It expires in <strong>10 minutes</strong>.</p>
        <div style="background:#1565C0;color:white;font-size:32px;font-weight:700;letter-spacing:10px;text-align:center;padding:20px 32px;border-radius:10px;">
          ${otp}
        </div>
        <p style="color:#999;font-size:12px;margin:20px 0 0;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}