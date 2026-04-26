/**
 * Signature Routes
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/signatures — Sync a signature
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const existing = db.prepare('SELECT id FROM signatures WHERE id = ?').get(data.id);
    if (existing) {
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();
    db.prepare(`
      INSERT INTO signatures (id, user_id, submission_id, data_url, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.id, req.user.id, data.submissionId || null, data.dataUrl || null, data.createdAt || now);

    db.prepare('INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), req.user.id, 'signature', data.id, 'received', now);

    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    console.error('Signature sync error:', err);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// GET /api/signatures
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const sigs = db.prepare('SELECT id, user_id, submission_id, created_at FROM signatures WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ signatures: sigs });
});

module.exports = router;
