/**
 * Route Tracking Routes
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/routes — Sync a route with its points
router.post('/', authenticate, (req, res) => {
  try {
    const db = getDb();
    const data = req.body;

    const existing = db.prepare('SELECT id FROM routes WHERE id = ?').get(data.id);
    if (existing) {
      return res.json({ status: 'already_synced', id: data.id });
    }

    const now = Date.now();

    const insertRoute = db.prepare(`
      INSERT INTO routes (id, user_id, status, start_time, end_time, point_count, distance, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertPoint = db.prepare(`
      INSERT INTO route_points (id, route_id, latitude, longitude, accuracy, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const syncRoute = db.transaction(() => {
      insertRoute.run(
        data.id, req.user.id,
        data.status || 'completed',
        data.startTime || now, data.endTime || null,
        data.pointCount || 0, data.distance || 0,
        data.createdAt || now
      );

      // Insert route points if provided
      if (data.points && Array.isArray(data.points)) {
        for (const pt of data.points) {
          insertPoint.run(uuidv4(), data.id, pt.lat, pt.lng, pt.accuracy || null, pt.ts || now);
        }
      }

      db.prepare('INSERT INTO sync_log (id, user_id, operation_type, entity_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(uuidv4(), req.user.id, 'route', data.id, 'received', now);
    });

    syncRoute();

    res.status(201).json({ status: 'synced', id: data.id });
  } catch (err) {
    console.error('Route sync error:', err);
    res.status(500).json({ error: 'Failed to save route' });
  }
});

// GET /api/routes
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const routes = db.prepare('SELECT * FROM routes WHERE user_id = ? ORDER BY start_time DESC').all(req.user.id);
  res.json({ routes });
});

// GET /api/routes/:id — Get route with points
router.get('/:id', authenticate, (req, res) => {
  const db = getDb();
  const route = db.prepare('SELECT * FROM routes WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!route) return res.status(404).json({ error: 'Not found' });

  const points = db.prepare('SELECT * FROM route_points WHERE route_id = ? ORDER BY timestamp ASC').all(req.params.id);
  res.json({ route, points });
});

module.exports = router;
