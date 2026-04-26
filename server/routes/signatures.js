/**
 * Signature Routes (PostgreSQL)
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/signatures — Sync a signature
router.post('/', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const { rows: existing } = await db.query('SELECT id FROM signatures WHERE id = $1', [data.id]);
    if (existing.length > 0) {
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();
    await db.query(
      'INSERT INTO signatures (id, user_id, submission_id, data_url, created_at) VALUES ($1, $2, $3, $4, $5)',
      [data.id, req.user.id, data.submissionId || null, data.dataUrl || null, data.createdAt || now]
    );

    await db.query(
      'INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), req.user.id, 'signature', data.id, 'received', now]
    );

    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    console.error('Signature sync error:', err);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// GET /api/signatures
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT id, user_id, submission_id, created_at FROM signatures WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ signatures: rows });
});

module.exports = router;
