import nodemailer from "nodemailer";

let transporter = null;

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

export async function sendOtpEmail(email, code, purpose) {
  const subject =
    purpose === "register"
      ? "FoodBridge — verify your email to register"
      : "FoodBridge — your login code";

  const html = `
    <div style="font-family:sans-serif;max-width:480px">
      <h2 style="color:#2E7D32">FoodBridge</h2>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>This code expires in 10 minutes. Do not share it with anyone.</p>
    </div>
  `;

  const transport = getTransporter();
  if (!transport) {
    console.log(`[OTP dev] ${email} → ${code} (${purpose})`);
    return { devMode: true };
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || "FoodBridge <noreply@foodbridge.local>",
    to: email,
    subject,
    html
  });
  return { devMode: false };
}
