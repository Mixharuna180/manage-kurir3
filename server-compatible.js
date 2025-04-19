// server-compatible.js - Server Express yang sangat kompatibel untuk deployment Ubuntu
const express = require('express');
const pg = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');

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

// Middleware untuk session
function sessionMiddleware(req, res, next) {
  const sessionId = req.headers.authorization?.replace('Bearer ', '') || 
                  req.cookies?.sessionId;
  
  if (sessionId && sessions[sessionId] && sessions[sessionId].expires > Date.now()) {
    req.user = sessions[sessionId].user;
    req.sessionId = sessionId;
  }
  
  next();
}

// Middleware untuk memerlukan otentikasi
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'dist', 'client')));
app.use(sessionMiddleware);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server berjalan dengan baik (Compatible Version)'
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
      server_version: 'server-compatible.js'
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

// Users API
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, full_name, phone_number, user_type, created_at FROM users');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, full_name, phone_number, user_type, created_at FROM users WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Products API
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Orders API
app.get('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: err.message });
  }
});

// User orders
app.get('/api/orders/user/:userId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE user_id = $1', [req.params.userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// Warehouses API
app.get('/api/warehouses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM warehouses');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching warehouses:', err);
    res.status(500).json({ error: err.message });
  }
});

// Driver assignments API
app.get('/api/drivers/available', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, username, email, full_name, phone_number, service_area FROM users WHERE user_type = 'driver'");
    res.json(rows);
  } catch (err) {
    console.error('Error fetching available drivers:', err);
    res.status(500).json({ error: err.message });
  }
});

// Tracking events API
app.get('/api/tracking/:orderId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tracking_events WHERE order_id = $1 ORDER BY created_at ASC', [req.params.orderId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tracking events:', err);
    res.status(500).json({ error: err.message });
  }
});

// Auth routes
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    const user = rows[0];
    const passwordMatch = await comparePasswords(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Create session
    const sessionId = generateSessionId();
    const userWithoutPassword = { ...user };
    delete userWithoutPassword.password;
    
    sessions[sessionId] = {
      user: userWithoutPassword,
      expires: Date.now() + SESSION_EXPIRY
    };
    
    console.log('Login successful for user:', username);
    
    res.json({
      message: 'Login successful',
      sessionId,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.post('/api/logout', (req, res) => {
  const sessionId = req.sessionId;
  
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
    res.json({ message: 'Logout successful' });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Contoh endpoint yang memerlukan autentikasi
app.get('/api/orders/user', requireAuth, async (req, res) => {
  try {
    console.log('Getting orders for user ID:', req.user.id);
    const { rows } = await pool.query('SELECT * FROM orders WHERE user_id = $1', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: err.message });
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
      '      <p>This is a compatible server version.</p>\n' +
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

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message 
  });
});

// Start server
const server = app.listen(port, '0.0.0.0', () => {
  console.log('----------------------------------------');
  console.log('LogiTech Compatible Server v1.0');
  console.log('----------------------------------------');
  console.log('Server running at: http://0.0.0.0:' + port);
  console.log('Database: PostgreSQL Standard');
  console.log('API Health Check: http://localhost:' + port + '/api/health');
  console.log('----------------------------------------');
  
  // Ensure index.html exists
  ensureIndexHtml();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.log('Server akan tetap berjalan meskipun terjadi error');
});

module.exports = app;