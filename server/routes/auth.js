/**
 * Auth Routes — Real-world authentication (PostgreSQL)
 * 
 * Endpoints:
 *   POST /api/auth/register          — Email registration
 *   POST /api/auth/login             — Email + password login
 *   POST /api/auth/google            — Google OAuth sign-in
 *   GET  /api/auth/verify/:token     — Email verification
 *   POST /api/auth/resend-verification — Resend verification email
 *   POST /api/auth/forgot-password   — Request password reset
 *   POST /api/auth/reset-password    — Reset password with token
 *   GET  /api/auth/me                — Get current user
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticate, generateToken } = require('../middleware/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/email');

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ─────────────────────────────────────────────
// POST /api/auth/register — Email registration
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();

    // Check if email already exists
    const { rows: existing } = await db.query('SELECT id, auth_provider FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      if (existing[0].auth_provider === 'google') {
        return res.status(409).json({ error: 'This email is linked to a Google account. Please sign in with Google.' });
      }
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const now = Date.now();

    // Create user (unverified)
    await db.query(
      `INSERT INTO users (id, email, password, name, role, auth_provider, email_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, email.toLowerCase(), hashedPassword, name || email.split('@')[0], 'technician', 'local', false, now, now]
    );

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

    await db.query(
      'INSERT INTO email_verifications (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), id, verifyToken, expiresAt, now]
    );

    // Send verification email
    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    res.status(201).json({
      message: 'Account created! Please check your email to verify your account.',
      requiresVerification: true,
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/verify/:token — Email verification
// ─────────────────────────────────────────────
router.get('/verify/:token', async (req, res) => {
  try {
    const db = getDb();
    const now = Date.now();

    const { rows } = await db.query(
      'SELECT * FROM email_verifications WHERE token = $1 AND expires_at > $2',
      [req.params.token, now]
    );

    if (rows.length === 0) {
      return res.redirect(`${APP_URL}/?verified=expired`);
    }

    const verification = rows[0];

    // Mark user as verified
    await db.query('UPDATE users SET email_verified = TRUE, updated_at = $1 WHERE id = $2', [now, verification.user_id]);

    // Delete used token (and any old tokens for this user)
    await db.query('DELETE FROM email_verifications WHERE user_id = $1', [verification.user_id]);

    // Redirect to app with success
    res.redirect(`${APP_URL}/?verified=success`);
  } catch (err) {
    console.error('Verification error:', err);
    res.redirect(`${APP_URL}/?verified=error`);
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/resend-verification
// ─────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const db = getDb();
    const { rows } = await db.query('SELECT id, email_verified FROM users WHERE email = $1 AND auth_provider = $2', [email.toLowerCase(), 'local']);

    if (rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ message: 'If an account exists with that email, a verification link has been sent.' });
    }

    if (rows[0].email_verified) {
      return res.json({ message: 'Email is already verified. You can sign in.' });
    }

    const userId = rows[0].id;
    const now = Date.now();

    // Delete old tokens
    await db.query('DELETE FROM email_verifications WHERE user_id = $1', [userId]);

    // Generate new token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + 24 * 60 * 60 * 1000;

    await db.query(
      'INSERT INTO email_verifications (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)',
      [uuidv4(), userId, verifyToken, expiresAt, now]
    );

    try {
      await sendVerificationEmail(email, verifyToken);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    res.json({ message: 'If an account exists with that email, a verification link has been sent.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login — Email + password login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const db = getDb();
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = rows[0];

    // Check if this is a Google-only account
    if (user.auth_provider === 'google' && !user.password) {
      return res.status(401).json({ error: 'This account uses Google sign-in. Please sign in with Google.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check email verification
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email address before signing in.',
        requiresVerification: true,
        email: user.email,
      });
    }

    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      auth_provider: user.auth_provider,
    };
    const token = generateToken(userData);

    res.json({ user: userData, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/google — Google OAuth sign-in
// ─────────────────────────────────────────────
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify Google token by calling Google's tokeninfo endpoint
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!response.ok) {
      return res.status(401).json({ error: 'Invalid Google credential' });
    }

    const payload = await response.json();

    // Verify audience matches our client ID (if set)
    if (GOOGLE_CLIENT_ID && payload.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Token audience mismatch' });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ error: 'Google account does not have an email' });
    }

    const db = getDb();
    const now = Date.now();

    // Check if user already exists by google_id
    let { rows } = await db.query('SELECT * FROM users WHERE google_id = $1', [googleId]);

    if (rows.length === 0) {
      // Check if email already exists (link accounts)
      const { rows: emailRows } = await db.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

      if (emailRows.length > 0) {
        // Link Google to existing account
        await db.query(
          'UPDATE users SET google_id = $1, avatar_url = $2, email_verified = TRUE, auth_provider = CASE WHEN auth_provider = $3 THEN $4 ELSE auth_provider END, updated_at = $5 WHERE id = $6',
          [googleId, picture || null, 'local', 'local', now, emailRows[0].id]
        );
        rows = [{ ...emailRows[0], google_id: googleId, avatar_url: picture, email_verified: true }];
      } else {
        // Create new user
        const id = uuidv4();
        await db.query(
          `INSERT INTO users (id, email, name, role, auth_provider, google_id, avatar_url, email_verified, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [id, email.toLowerCase(), name || email.split('@')[0], 'technician', 'google', googleId, picture || null, true, now, now]
        );
        rows = [{ id, email: email.toLowerCase(), name: name || email.split('@')[0], role: 'technician', auth_provider: 'google', avatar_url: picture }];
      }
    }

    const user = rows[0];
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar_url: user.avatar_url,
      auth_provider: user.auth_provider || 'google',
    };
    const token = generateToken(userData);

    res.json({ user: userData, token });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const db = getDb();
    const { rows } = await db.query('SELECT id, auth_provider FROM users WHERE email = $1', [email.toLowerCase()]);

    // Always return same message (don't reveal if email exists)
    const message = 'If an account exists with that email, a password reset link has been sent.';

    if (rows.length === 0) {
      return res.json({ message });
    }

    if (rows[0].auth_provider === 'google') {
      return res.json({ message: 'This account uses Google sign-in. No password to reset.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1 hour

    await db.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, expires, rows[0].id]
    );

    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (emailErr) {
      console.error('Failed to send reset email:', emailErr);
    }

    res.json({ message });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const db = getDb();
    const now = Date.now();

    const { rows } = await db.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > $2',
      [token, now]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await db.query(
      'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = $2 WHERE id = $3',
      [hashedPassword, now, rows[0].id]
    );

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─────────────────────────────────────────────
// GET /api/auth/me — Get current user
// ─────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT id, email, username, name, role, auth_provider, avatar_url, email_verified, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: rows[0] });
});

module.exports = router;
