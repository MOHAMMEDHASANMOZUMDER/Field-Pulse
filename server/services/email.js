/**
 * Email Service — Nodemailer with Gmail SMTP
 * 
 * Required environment variables:
 *   EMAIL_USER — Gmail address (e.g. yourapp@gmail.com)
 *   EMAIL_PASS — Gmail App Password (NOT regular password)
 *   APP_URL   — Base URL of the app (e.g. https://field-pulse-zeta.vercel.app)
 */
const nodemailer = require('nodemailer');

const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

let transporter = null;

if (EMAIL_USER && EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
  console.log('📧 Email service configured with Gmail SMTP');
} else {
  console.warn('⚠️  EMAIL_USER / EMAIL_PASS not set — emails will be logged to console');
}

/**
 * Send an email (or log it if no transporter)
 */
async function sendMail({ to, subject, html }) {
  if (transporter) {
    return transporter.sendMail({
      from: `"FieldPulse" <${EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  }
  // Fallback: log to console for development
  console.log('\n📧 EMAIL (dev mode — no SMTP configured)');
  console.log(`   To: ${to}`);
  console.log(`   Subject: ${subject}`);
  console.log(`   Body: ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
  console.log('');
}

/**
 * Send email verification link
 */
async function sendVerificationEmail(to, token) {
  const verifyUrl = `${APP_URL}/api/auth/verify/${token}`;

  await sendMail({
    to,
    subject: 'Verify your FieldPulse account',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;">
        <div style="background:linear-gradient(135deg,#0f1419,#1a1f2e);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="width:48px;height:48px;margin:0 auto 16px;background:linear-gradient(135deg,#e8a838,#f0c060);border-radius:12px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">⚡</span>
          </div>
          <h1 style="color:#fff;font-size:22px;margin:0;">FieldPulse</h1>
          <p style="color:#8899aa;font-size:14px;margin:8px 0 0;">Field Service Management</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
          <h2 style="font-size:18px;margin:0 0 12px;color:#0f1419;">Verify your email</h2>
          <p style="font-size:14px;line-height:1.6;color:#555;margin:0 0 24px;">
            Thanks for signing up! Click the button below to verify your email address and activate your account.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e8a838,#f0c060);color:#0f1419;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
              Verify Email Address
            </a>
          </div>
          <p style="font-size:12px;color:#888;margin:24px 0 0;line-height:1.5;">
            This link expires in 24 hours. If you didn't create a FieldPulse account, you can safely ignore this email.
          </p>
        </div>
        <div style="background:#f8f9fa;padding:16px 32px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
          <p style="font-size:11px;color:#aaa;margin:0;">© ${new Date().getFullYear()} FieldPulse. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}

/**
 * Send password reset link
 */
async function sendPasswordResetEmail(to, token) {
  const resetUrl = `${APP_URL}/?reset=${token}`;

  await sendMail({
    to,
    subject: 'Reset your FieldPulse password',
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;">
        <div style="background:linear-gradient(135deg,#0f1419,#1a1f2e);padding:32px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="width:48px;height:48px;margin:0 auto 16px;background:linear-gradient(135deg,#e8a838,#f0c060);border-radius:12px;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:24px;">⚡</span>
          </div>
          <h1 style="color:#fff;font-size:22px;margin:0;">FieldPulse</h1>
          <p style="color:#8899aa;font-size:14px;margin:8px 0 0;">Field Service Management</p>
        </div>
        <div style="background:#ffffff;padding:32px;border:1px solid #e5e7eb;border-top:none;">
          <h2 style="font-size:18px;margin:0 0 12px;color:#0f1419;">Reset your password</h2>
          <p style="font-size:14px;line-height:1.6;color:#555;margin:0 0 24px;">
            We received a request to reset your password. Click the button below to choose a new one.
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#e8a838,#f0c060);color:#0f1419;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
              Reset Password
            </a>
          </div>
          <p style="font-size:12px;color:#888;margin:24px 0 0;line-height:1.5;">
            This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="background:#f8f9fa;padding:16px 32px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
          <p style="font-size:11px;color:#aaa;margin:0;">© ${new Date().getFullYear()} FieldPulse. All rights reserved.</p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
