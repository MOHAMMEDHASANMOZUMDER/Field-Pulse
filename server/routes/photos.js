/**
 * Photo Routes
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/photos — Sync a photo (base64 data URL)
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const existing = db.prepare('SELECT id FROM photos WHERE id = ?').get(data.id);
    if (existing) {
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();
    db.prepare(`
      INSERT INTO photos (id, user_id, submission_id, data_url, latitude, longitude, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, req.user.id,
      data.submissionId || null, data.dataUrl || null,
      data.latitude || null, data.longitude || null,
      data.createdAt || now
    );

    db.prepare('INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), req.user.id, 'photo', data.id, 'received', now);

    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    console.error('Photo sync error:', err);
    res.status(500).json({ error: 'Failed to save photo' });
  }
});

// GET /api/photos
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const photos = db.prepare('SELECT id, user_id, submission_id, latitude, longitude, created_at FROM photos WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ photos });
});

// GET /api/photos/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const photo = db.prepare('SELECT * FROM photos WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!photo) return res.status(404).json({ error: 'Not found' });
  res.json({ photo });
});

module.exports = router;
