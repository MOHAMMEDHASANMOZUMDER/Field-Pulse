/**
 * Photo Routes (PostgreSQL)
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/photos — Sync a photo (base64 data URL)
router.post('/', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const { rows: existing } = await db.query('SELECT id FROM photos WHERE id = $1', [data.id]);
    if (existing.length > 0) {
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();
    await db.query(
      `INSERT INTO photos (id, user_id, submission_id, data_url, latitude, longitude, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.id, req.user.id,
        data.submissionId || null, data.dataUrl || null,
        data.latitude || null, data.longitude || null,
        data.createdAt || now,
      ]
    );

    await db.query(
      'INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), req.user.id, 'photo', data.id, 'received', now]
    );

    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    console.error('Photo sync error:', err);
    res.status(500).json({ error: 'Failed to save photo' });
  }
});

// GET /api/photos
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT id, user_id, submission_id, latitude, longitude, created_at FROM photos WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ photos: rows });
});

// GET /api/photos/:id
router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT * FROM photos WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ photo: rows[0] });
});

module.exports = router;
