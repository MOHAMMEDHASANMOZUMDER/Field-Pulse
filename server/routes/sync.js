/**
 * Master Sync Route (PostgreSQL)
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/sync/status — Get sync status for user
router.get('/status', authenticate, async (req, res) => {
  const db = getDb();

  const [submissions, photos, signatures, routes, recentSync] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM submissions WHERE user_id = $1', [req.user.id]),
    db.query('SELECT COUNT(*) as count FROM photos WHERE user_id = $1', [req.user.id]),
    db.query('SELECT COUNT(*) as count FROM signatures WHERE user_id = $1', [req.user.id]),
    db.query('SELECT COUNT(*) as count FROM routes WHERE user_id = $1', [req.user.id]),
    db.query('SELECT * FROM sync_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20', [req.user.id]),
  ]);

  res.json({
    counts: {
      submissions: parseInt(submissions.rows[0].count),
      photos: parseInt(photos.rows[0].count),
      signatures: parseInt(signatures.rows[0].count),
      routes: parseInt(routes.rows[0].count),
    },
    recentSync: recentSync.rows,
    serverTime: Date.now(),
  });
});

module.exports = router;
