/**
 * Database initialization and access layer
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'fieldpulse.db');

let db;

function init() {
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Read and execute schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  console.log('Database initialized at:', DB_PATH);
  return db;
}

function getDb() {
  if (!db) init();
  return db;
}

module.exports = { init, getDb };
