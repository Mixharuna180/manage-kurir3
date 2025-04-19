// server-node12.cjs - Server Express yang kompatibel dengan Node.js versi lama (CommonJS)
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
pool.query('SELECT NOW()', function(err, res) {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to PostgreSQL database at:', res.rows[0].now);
  }
});

// Helper functions for password hashing
async function comparePasswords(supplied, stored) {
  try {
    const parts = stored.split('.');
    const hashed = parts[0];
    const salt = parts[1];
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
  let sessionId = null;
  
  if (req.headers.authorization) {
    // Check untuk Authorization header (Bearer token)
    var authHeader = req.headers.authorization;
    if (authHeader.indexOf('Bearer ') === 0) {
      sessionId = authHeader.substring(7);
    }
  } else if (req.cookies && req.cookies.sessionId) {
    // Alternatif menggunakan cookies jika tersedia
    sessionId = req.cookies.sessionId;
  }
  
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
app.use(express.static(path.join(__dirname, 'dist', 'client')));
app.use(sessionMiddleware);

// Health check endpoint
app.get('/api/health', function(req, res) {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server berjalan dengan baik (Node v12 Compatible Version)'
  });
});

// Database test endpoint
app.get('/api/dbtest', function(req, res) {
  pool.query('SELECT NOW()', function(err, result) {
    if (err) {
      console.error('Database error:', err);
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        error: err.message
      });
    } else {
      res.json({
        status: 'success',
        message: 'Database connection successful',
        time: result.rows[0].now,
        db_url: process.env.DATABASE_URL ? 'Configured (value hidden)' : 'Missing',
        server_version: 'server-node12.cjs'
      });
    }
  });
});

// Users API
app.get('/api/users', function(req, res) {
  pool.query('SELECT id, username, email, full_name, phone_number, user_type, created_at FROM users', 
    function(err, result) {
      if (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: err.message });
      } else {
        res.json(result.rows);
      }
    }
  );
});

// Auth routes
app.post('/api/login', function(req, res) {
  var username = req.body.username;
  var password = req.body.password;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  pool.query('SELECT * FROM users WHERE username = $1', [username], function(err, result) {
    if (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Database error during login' });
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    var user = result.rows[0];
    
    comparePasswords(password, user.password)
      .then(function(passwordMatch) {
        if (!passwordMatch) {
          return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Create session
        var sessionId = generateSessionId();
        var userWithoutPassword = Object.assign({}, user);
        delete userWithoutPassword.password;
        
        sessions[sessionId] = {
          user: userWithoutPassword,
          expires: Date.now() + SESSION_EXPIRY
        };
        
        console.log('Login successful for user:', username);
        
        res.json({
          message: 'Login successful',
          sessionId: sessionId,
          user: userWithoutPassword
        });
      })
      .catch(function(err) {
        console.error('Password comparison error:', err);
        res.status(500).json({ error: 'Internal server error during login' });
      });
  });
});

app.post('/api/logout', function(req, res) {
  var sessionId = req.sessionId;
  
  if (sessionId && sessions[sessionId]) {
    delete sessions[sessionId];
    res.json({ message: 'Logout successful' });
  } else {
    res.status(401).json({ error: 'Not logged in' });
  }
});

app.get('/api/user', function(req, res) {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Create fallback index.html if not exists
function ensureIndexHtml() {
  var indexPath = path.join(__dirname, 'dist', 'client', 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.log('Creating fallback index.html...');
    
    // Ensure directory exists
    if (!fs.existsSync(path.join(__dirname, 'dist', 'client'))) {
      fs.mkdirSync(path.join(__dirname, 'dist', 'client'), { recursive: true });
    }
    
    // Create simple HTML file
    var html = '<!DOCTYPE html>\n' +
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
      '      <p>This is a Node.js v12 compatible server version.</p>\n' +
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
app.get('*', function(req, res) {
  ensureIndexHtml();
  var indexPath = path.join(__dirname, 'dist', 'client', 'index.html');
  res.sendFile(indexPath);
});

// Start server
var server = app.listen(port, '0.0.0.0', function() {
  console.log('----------------------------------------');
  console.log('LogiTech Server v1.0 (Node.js v12 Compatible)');
  console.log('----------------------------------------');
  console.log('Server running at: http://0.0.0.0:' + port);
  console.log('Database: PostgreSQL Standard');
  console.log('API Health Check: http://localhost:' + port + '/api/health');
  console.log('----------------------------------------');
  
  // Ensure index.html exists
  ensureIndexHtml();
});

// Handle uncaught exceptions
process.on('uncaughtException', function(err) {
  console.error('Uncaught Exception:', err);
  console.log('Server akan tetap berjalan meskipun terjadi error');
});

module.exports = app;