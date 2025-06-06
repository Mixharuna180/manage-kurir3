// server-pg.js - Basic Express server with PostgreSQL connection
// This file can be run directly: node server-pg.js
// No build step required! Perfect for troubleshooting.

import express from 'express';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for environment variables
if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL not set. Using default PostgreSQL connection.");
  process.env.DATABASE_URL = "postgresql://logitech:Anam490468@localhost:5432/logitech_db";
}

// PostgreSQL database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for local PostgreSQL
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist', 'client')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server berjalan dengan baik (PostgreSQL version)'
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
      server_version: 'server-pg.js'
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

// List users endpoint (if users table exists)
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, user_type FROM users LIMIT 10');
    res.json({
      status: 'success',
      count: result.rows.length,
      users: result.rows
    });
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch users',
      error: err.message
    });
  }
});

// Create fallback index.html if not exists
const ensureIndexHtml = () => {
  const indexPath = path.join(__dirname, 'dist', 'client', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('Creating fallback index.html...');
    
    // Ensure directory exists
    if (!fs.existsSync(path.join(__dirname, 'dist', 'client'))) {
      fs.mkdirSync(path.join(__dirname, 'dist', 'client'), { recursive: true });
    }
    
    // Create a basic HTML file
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LogiTech Delivery System</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
    .container { max-width: 800px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #0066cc; }
    .api-link { display: inline-block; margin: 10px 0; padding: 8px 16px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; }
    .api-link:hover { background: #0055aa; }
    .status-box { margin-top: 20px; padding: 15px; background: #e8f5e9; border-radius: 4px; border-left: 4px solid #43a047; }
  </style>
</head>
<body>
  <div class="container">
    <h1>LogiTech Delivery System</h1>
    <p>Simplified server running with PostgreSQL standard connection</p>
    
    <div class="status-box">
      <h3>Server Status: Running</h3>
      <p>This is a minimal server version that connects to PostgreSQL directly without Neon Database WebSocket.</p>
    </div>
    
    <h3>API Endpoints:</h3>
    <ul>
      <li><a href="/api/health" class="api-link">Health Check</a></li>
      <li><a href="/api/dbtest" class="api-link">Database Test</a></li>
      <li><a href="/api/users" class="api-link">List Users</a></li>
    </ul>
    
    <p><strong>Note:</strong> This page is generated by server-pg.js, a simplified server configuration.</p>
  </div>
</body>
</html>
    `;
    
    fs.writeFileSync(indexPath, html);
    console.log('Created fallback index.html');
  }
};

// Catchall route for SPA
app.get('*', (req, res) => {
  ensureIndexHtml();
  const indexPath = path.join(__dirname, 'dist', 'client', 'index.html');
  res.sendFile(indexPath);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║        LogiTech Basic PostgreSQL Server    ║
╠════════════════════════════════════════════╣
║ Server running at: http://0.0.0.0:${port}      ║
║ Database: PostgreSQL Standard               ║
║ API Health Check: http://localhost:${port}/api/health ║
╚════════════════════════════════════════════╝
  `);
  
  // Ensure index.html exists
  ensureIndexHtml();
});