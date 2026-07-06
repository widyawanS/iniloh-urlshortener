import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure DB directory and file exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({}));
}

export function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return {};
  }
}

export function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 7);
}

export function generateSecretKey() {
  return 'sk_' + crypto.randomBytes(12).toString('hex');
}

export function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash;
}

// Migrate old format { "id": "url" } to new format { "id": { url, ... } }
export function migrateDB() {
  const db = readDB();
  let migrated = false;

  for (const [id, value] of Object.entries(db)) {
    if (typeof value === 'string') {
      db[id] = {
        url: value,
        createdAt: new Date().toISOString(),
        currentClicks: 0,
      };
      migrated = true;
    }
  }

  if (migrated) {
    writeDB(db);
  }

  return db;
}

// Check if link is expired or burned
export function isLinkActive(link) {
  if (!link) return false;

  // Check expiry
  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return false;
  }

  // Check burn (max clicks reached)
  if (link.maxClicks && link.currentClicks >= link.maxClicks) {
    return false;
  }

  return true;
}

// Increment click counter
export function recordClick(id) {
  const db = readDB();
  if (db[id]) {
    db[id].currentClicks = (db[id].currentClicks || 0) + 1;
    writeDB(db);
    return db[id];
  }
  return null;
}
