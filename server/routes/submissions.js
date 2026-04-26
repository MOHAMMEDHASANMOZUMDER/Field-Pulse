/**
 * Submission Routes
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/submissions — Create or sync a submission
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    // Check if already exists (idempotency)
    const existing = db.prepare('SELECT id FROM submissions WHERE id = ?').get(data.id);
    if (existing) {
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();
    db.prepare(`
      INSERT INTO submissions (id, user_id, customer_name, phone, address, latitude, longitude, gps_accuracy, service_type, status, notes, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.id, req.user.id,
      data.customerName || null, data.phone || null, data.address || null,
      data.latitude || null, data.longitude || null, data.gpsAccuracy || null,
      data.serviceType || null, data.status || 'completed',
      data.notes || null, data.version || 1,
      data.createdAt || now, now
    );

    // Log sync
    db.prepare('INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(uuidv4(), req.user.id, 'submission', data.id, 'received', now);

    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    console.error('Submission sync error:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// GET /api/submissions — List user's submissions
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const submissions = db.prepare('SELECT * FROM submissions WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ submissions });
});

// GET /api/submissions/:id
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!submission) return res.status(404).json({ error: 'Not found' });
  res.json({ submission });
});

module.exports = router;
