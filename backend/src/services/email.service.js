import nodemailer from "nodemailer";

let transporter = null;

function getFrom() {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || "FoodBridge <noreply@foodbridge.app>";
}

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
  return transporter;
}

function baseTemplate(title, bodyHtml) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:Segoe UI,Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <tr><td style="background:#2E7D32;padding:24px 28px">
      <h1 style="margin:0;color:#fff;font-size:22px">FoodBridge</h1>
      <p style="margin:6px 0 0;color:#c8e6c9;font-size:13px">Connecting surplus food with people who need it</p>
    </td></tr>
    <tr><td style="padding:28px">
      <h2 style="margin:0 0 16px;color:#1b5e20;font-size:18px">${title}</h2>
      ${bodyHtml}
      <p style="margin:28px 0 0;font-size:12px;color:#888;border-top:1px solid #eee;padding-top:16px">
        FoodBridge — Kindness, Sustainability, Community
      </p>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendMail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[email dev] To: ${to} | Subject: ${subject}`);
    return { devMode: true };
  }
  await transport.sendMail({ from: getFrom(), to, subject, html });
  return { devMode: false };
}

export async function sendOtpEmail(email, code, purpose) {
  const subject = "Your FoodBridge Verification Code";
  const action = purpose === "register" ? "complete your registration" : "sign in to your account";
  const html = baseTemplate(
    "Verification code",
    `<p style="color:#444;line-height:1.6">Use this code to ${action}:</p>
     <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2E7D32;margin:20px 0">${code}</p>
     <p style="color:#666;font-size:14px">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>`
  );
  return sendMail({ to: email, subject, html });
}

export async function sendWelcomeEmail(email, name) {
  const html = baseTemplate(
    `Welcome, ${name}!`,
    `<p style="color:#444;line-height:1.6">Your FoodBridge account is ready. You can now donate food, browse nearby listings, and book pickups.</p>
     <p style="color:#444;line-height:1.6">Thank you for helping reduce food waste and support your community.</p>`
  );
  return sendMail({ to: email, subject: "Welcome to FoodBridge", html });
}

export async function sendDonationConfirmationEmail(email, { foodName, address, expiryTime }) {
  const html = baseTemplate(
    "Donation posted",
    `<p style="color:#444;line-height:1.6">Your donation <strong>${foodName}</strong> is now live.</p>
     <p style="color:#444"><strong>Pickup address:</strong> ${address}</p>
     <p style="color:#444"><strong>Expires:</strong> ${new Date(expiryTime).toLocaleString()}</p>`
  );
  return sendMail({ to: email, subject: "FoodBridge — Donation confirmed", html });
}

export async function sendBookingConfirmationEmail(email, { foodName, status, bookingDateTime, address }) {
  const html = baseTemplate(
    "Booking update",
    `<p style="color:#444;line-height:1.6">Your booking for <strong>${foodName}</strong> is <strong>${status}</strong>.</p>
     <p style="color:#444"><strong>Pickup:</strong> ${address || "See app for details"}</p>
     <p style="color:#444"><strong>Time:</strong> ${new Date(bookingDateTime).toLocaleString()}</p>
     <p style="color:#666;font-size:14px">Open the app to track pickup location in real time.</p>`
  );
  return sendMail({ to: email, subject: "FoodBridge — Booking confirmation", html });
}

export async function sendPasswordResetEmail(email, code) {
  const html = baseTemplate(
    "Password reset",
    `<p style="color:#444;line-height:1.6">Use this code to reset your password:</p>
     <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#2E7D32;margin:20px 0">${code}</p>
     <p style="color:#666;font-size:14px">Expires in 10 minutes. If you didn't request this, ignore this email.</p>`
  );
  return sendMail({ to: email, subject: "FoodBridge — Password reset", html });
}
