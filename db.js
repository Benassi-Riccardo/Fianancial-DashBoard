import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Pool } = pg;

let pool = null;

// File fallback path (used when DATABASE_URL is not set)
const DATA_DIR = path.resolve(process.cwd(), '.data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists if fallback is used
function ensureFallbackStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf-8');
  }
}

export async function initDb() {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      pool = new Pool({
        connectionString: dbUrl,
        ssl: process.env.NODE_ENV === 'production' || dbUrl.includes('render.com') || dbUrl.includes('neon.tech') || dbUrl.includes('supabase.co') 
          ? { rejectUnauthorized: false } 
          : false,
      });

      // Create users table if not exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          name VARCHAR(255),
          picture VARCHAR(500),
          provider VARCHAR(50) DEFAULT 'local',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ PostgreSQL connected and users table verified.');
      return;
    } catch (err) {
      console.error('⚠️ Failed to connect to DATABASE_URL. Falling back to local storage:', err.message);
      pool = null;
    }
  }

  // Fallback to local storage file
  console.log('📁 Using file storage fallback for users (.data/users.json)');
  ensureFallbackStorage();
}

export async function findUserByEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();
  if (pool) {
    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [normalizedEmail]);
    return res.rows[0] || null;
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const users = JSON.parse(raw || '[]');
  return users.find((u) => u.email.toLowerCase() === normalizedEmail) || null;
}

export async function findUserById(id) {
  if (pool) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const users = JSON.parse(raw || '[]');
  return users.find((u) => String(u.id) === String(id)) || null;
}

export async function createUser({ email, passwordHash = null, name = '', picture = '', provider = 'local' }) {
  const normalizedEmail = email.toLowerCase().trim();

  if (pool) {
    const res = await pool.query(
      `INSERT INTO users (email, password_hash, name, picture, provider)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [normalizedEmail, passwordHash, name, picture, provider]
    );
    return res.rows[0];
  }

  ensureFallbackStorage();
  const raw = fs.readFileSync(USERS_FILE, 'utf-8');
  const users = JSON.parse(raw || '[]');
  const newUser = {
    id: Date.now().toString(),
    email: normalizedEmail,
    password_hash: passwordHash,
    name,
    picture,
    provider,
    created_at: new Date().toISOString(),
  };
  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  return newUser;
}
