/**
 * FieldPulse — Express Server Entry Point
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { init: initDb } = require('./db/database');

// Initialize database
initDb();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large limit for base64 photos
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/signatures', require('./routes/signatures'));
app.use('/api/routes', require('./routes/routes'));
app.use('/api/sync', require('./routes/sync'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), version: '1.0.0' });
});

// SPA fallback — serve index.html for any non-API, non-static route
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║                                          ║
║   ⚡ FieldPulse Server                   ║
║   Running on http://localhost:${PORT}       ║
║                                          ║
║   API:      /api/*                       ║
║   Frontend: http://localhost:${PORT}       ║
║                                          ║
╚══════════════════════════════════════════╝
  `);
});
