// server-simple.js - Server Express sangat sederhana untuk deployment
const express = require('express');
const pg = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 5000;

// Database setup
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL tidak diatur. Menggunakan koneksi PostgreSQL default.");
  process.env.DATABASE_URL = "postgresql://logitech:Anam490468@localhost:5432/logitech_db";
}

// Koneksi database
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Test koneksi
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to PostgreSQL database at:', res.rows[0].now);
  }
});

// Helper functions for password hashing
async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split('.');
    const hashedBuf = Buffer.from(hashed, 'hex');
    const derivedKey = crypto.scryptSync(supplied, salt, 64);
    return crypto.timingSafeEqual(hashedBuf, derivedKey);
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
}

// Membuat session handling sederhana dengan memory store
const sessions = {};
const SESSION_EXPIRY = 24 * 60 * 60 * 1000; // 24 jam

function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dist', 'client')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server berjalan dengan baik (Simple Server Version)'
  });
});

// Database test endpoint
app.get('/api/dbtest', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'success',
      message: 'Database connection successful',
      time: result.rows[0].now,
      db_url: process.env.DATABASE_URL ? 'Configured (value hidden)' : 'Missing',
      server_version: 'server-simple.js'
    });
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Create fallback index.html if not exists
function ensureIndexHtml() {
  const indexPath = path.join(__dirname, 'dist', 'client', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('Creating fallback index.html...');
    
    // Ensure directory exists
    if (!fs.existsSync(path.join(__dirname, 'dist', 'client'))) {
      fs.mkdirSync(path.join(__dirname, 'dist', 'client'), { recursive: true });
    }
    
    // Create simple HTML file
    const html = '<!DOCTYPE html>\n' +
      '<html>\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <title>LogiTech Delivery System</title>\n' +
      '  <style>\n' +
      '    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }\n' +
      '    h1 { color: #0066cc; }\n' +
      '    .container { max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; border-radius: 5px; }\n' +
      '  </style>\n' +
      '</head>\n' +
      '<body>\n' +
      '  <div class="container">\n' +
      '    <h1>LogiTech Delivery System</h1>\n' +
      '    <p>Server running with PostgreSQL standard connection</p>\n' +
      '    <div style="margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 4px;">\n' +
      '      <h3>Server Status: Running</h3>\n' +
      '      <p>This is a simplified server version.</p>\n' +
      '    </div>\n' +
      '    <h3>API Endpoints:</h3>\n' +
      '    <ul>\n' +
      '      <li><a href="/api/health">Health Check</a></li>\n' +
      '      <li><a href="/api/dbtest">Database Test</a></li>\n' +
      '    </ul>\n' +
      '  </div>\n' +
      '</body>\n' +
      '</html>';
    
    fs.writeFileSync(indexPath, html);
    console.log('Created fallback index.html');
  }
}

// Catchall route for SPA
app.get('*', (req, res) => {
  ensureIndexHtml();
  const indexPath = path.join(__dirname, 'dist', 'client', 'index.html');
  res.sendFile(indexPath);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log('----------------------------------------');
  console.log('LogiTech Basic Server');
  console.log('----------------------------------------');
  console.log('Server running at: http://0.0.0.0:' + port);
  console.log('Database: PostgreSQL Standard');
  console.log('API Health Check: http://localhost:' + port + '/api/health');
  console.log('----------------------------------------');
  
  // Ensure index.html exists
  ensureIndexHtml();
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.log('Server akan tetap berjalan meskipun terjadi error');
});