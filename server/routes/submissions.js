/**
 * Submission Routes (PostgreSQL)
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/submissions — Create or sync a submission
router.post('/', authenticate, async (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    // Check if already exists (idempotency)
    const { rows: existing } = await db.query('SELECT id FROM submissions WHERE id = $1', [data.id]);
    if (existing.length > 0) {
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();
    await db.query(
      `INSERT INTO submissions (id, user_id, customer_name, phone, address, latitude, longitude, gps_accuracy, service_type, status, notes, version, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        data.id, req.user.id,
        data.customerName || null, data.phone || null, data.address || null,
        data.latitude || null, data.longitude || null, data.gpsAccuracy || null,
        data.serviceType || null, data.status || 'completed',
        data.notes || null, data.version || 1,
        data.createdAt || now, now,
      ]
    );

    // Log sync
    await db.query(
      'INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), req.user.id, 'submission', data.id, 'received', now]
    );

    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    console.error('Submission sync error:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// GET /api/submissions — List user's submissions
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT * FROM submissions WHERE user_id = $1 ORDER BY created_at DESC',
    [req.user.id]
  );
  res.json({ submissions: rows });
});

// GET /api/submissions/:id
router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT * FROM submissions WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ submission: rows[0] });
});

module.exports = router;
