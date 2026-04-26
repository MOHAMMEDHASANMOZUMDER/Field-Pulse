/**
 * Master Sync Route
 */
const express = require('express');
const { getDb } = require('../db/database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/sync/status — Get sync status for user
router.get('/status', authenticate, (req, res) => {
  const db = getDb();

  const submissions = db.prepare('SELECT COUNT(*) as count FROM submissions WHERE user_id = ?').get(req.user.id);
  const photos = db.prepare('SELECT COUNT(*) as count FROM photos WHERE user_id = ?').get(req.user.id);
  const signatures = db.prepare('SELECT COUNT(*) as count FROM signatures WHERE user_id = ?').get(req.user.id);
  const routes = db.prepare('SELECT COUNT(*) as count FROM routes WHERE user_id = ?').get(req.user.id);
  const recentSync = db.prepare('SELECT * FROM sync_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').all(req.user.id);

  res.json({
    counts: {
      submissions: submissions.count,
      photos: photos.count,
      signatures: signatures.count,
      routes: routes.count,
    },
    recentSync,
    serverTime: Date.now(),
  });
});

module.exports = router;
