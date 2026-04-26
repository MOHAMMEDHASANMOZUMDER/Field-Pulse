/**
 * Route Tracking Routes (PostgreSQL)
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/routes — Sync a route with its points
router.post('/', authenticate, async (req, res) => {
  const client = await getDb().connect();
  try {
    const data = req.body;

    const { rows: existing } = await client.query('SELECT id FROM routes WHERE id = $1', [data.id]);
    if (existing.length > 0) {
      client.release();
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();

    // Use a transaction for route + points
    await client.query('BEGIN');

    await client.query(
      `INSERT INTO routes (id, user_id, status, start_time, end_time, point_count, distance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        data.id, req.user.id,
        data.status || 'completed',
        data.startTime || now, data.endTime || null,
        data.pointCount || 0, data.distance || 0,
        data.createdAt || now,
      ]
    );

    // Insert route points if provided
    if (data.points && Array.isArray(data.points)) {
      for (const pt of data.points) {
        await client.query(
          'INSERT INTO route_points (id, route_id, latitude, longitude, accuracy, "timestamp") VALUES ($1, $2, $3, $4, $5, $6)',
          [uuidv4(), data.id, pt.lat, pt.lng, pt.accuracy || null, pt.ts || now]
        );
      }
    }

    await client.query(
      'INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), req.user.id, 'route', data.id, 'received', now]
    );

    await client.query('COMMIT');
    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Route sync error:', err);
    res.status(500).json({ error: 'Failed to save route' });
  } finally {
    client.release();
  }
});

// GET /api/routes
router.get('/', authenticate, async (req, res) => {
  const db = getDb();
  const { rows } = await db.query(
    'SELECT * FROM routes WHERE user_id = $1 ORDER BY start_time DESC',
    [req.user.id]
  );
  res.json({ routes: rows });
});

// GET /api/routes/:id — Get route with points
router.get('/:id', authenticate, async (req, res) => {
  const db = getDb();
  const { rows: routeRows } = await db.query(
    'SELECT * FROM routes WHERE id = $1 AND user_id = $2',
    [req.params.id, req.user.id]
  );
  if (routeRows.length === 0) return res.status(404).json({ error: 'Not found' });

  const { rows: points } = await db.query(
    'SELECT * FROM route_points WHERE route_id = $1 ORDER BY "timestamp" ASC',
    [req.params.id]
  );
  res.json({ route: routeRows[0], points });
});

module.exports = router;
