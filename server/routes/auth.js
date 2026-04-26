/**
 * Auth Routes — Register, Login, Me (PostgreSQL)
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/database');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    const db = getDb();
    const { rows: existing } = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const now = Date.now();

    await db.query(
      'INSERT INTO users (id, username, password, name, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, username, hashedPassword, name || username, 'technician', now, now]
    );

    const user = { id, username, name: name || username, role: 'technician' };
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const db = getDb();
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = { id: user.id, username: user.username, name: user.name, role: user.role };
    const token = generateToken(userData);

    res.json({ user: userData, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT id, username, name, role, created_at FROM users WHERE id = $1',
    [req.user.id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: rows[0] });
});

module.exports = router;
