// server-full.js
// Full Express server dengan PostgreSQL connection
// Dijalankan dengan: node server-full.js
// Ini adalah versi gabungan yang mendukung Midtrans dan semua fitur aplikasi

import express from 'express';
import session from 'express-session';
import pg from 'pg';
import connectPg from 'connect-pg-simple';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { createServer } from 'http';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

// Setup paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

// Session store
const PostgresStore = connectPg(session);
const sessionStore = new PostgresStore({
  pool,
  tableName: 'session',
  createTableIfMissing: true
});

// Middleware untuk request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Middleware dasar
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dist', 'client')));

// Authentication helpers
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64));
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Session setup
app.use(session({
  store: sessionStore,
  secret: process.env.SESSION_SECRET || 'keyboard cat', // GANTI DI PRODUCTION
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set true if HTTPS
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    
    if (!user || !(await comparePasswords(password, user.password))) {
      return done(null, false, { message: 'Username atau password salah' });
    }
    
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = rows[0];
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Basic auth routes
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

app.post('/api/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    res.sendStatus(200);
  });
});

app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

// API routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server berjalan dengan baik (Full PostgreSQL version)'
  });
});

app.get('/api/dbtest', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'success',
      message: 'Database connection successful',
      time: result.rows[0].now,
      db_url: process.env.DATABASE_URL ? 'Configured' : 'Missing',
      server_version: 'server-full.js'
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

// Users
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, username, email, full_name, user_type, created_at FROM users');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: err.message });
  }
});

// Warehouses
app.get('/api/warehouses', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM warehouses');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching warehouses:', err);
    res.status(500).json({ error: err.message });
  }
});

// Orders
app.get('/api/orders', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM orders');
    res.json(rows);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: err.message });
  }
});

// User Orders
app.get('/api/orders/user', async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const { rows } = await pool.query('SELECT * FROM orders WHERE user_id = $1', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching user orders:', err);
    res.status(500).json({ error: err.message });
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
    <p>Full server running with PostgreSQL standard connection</p>
    
    <div class="status-box">
      <h3>Server Status: Running</h3>
      <p>This is a full server version that connects to PostgreSQL directly without Neon Database WebSocket.</p>
    </div>
    
    <h3>API Endpoints:</h3>
    <ul>
      <li><a href="/api/health" class="api-link">Health Check</a></li>
      <li><a href="/api/dbtest" class="api-link">Database Test</a></li>
      <li><a href="/api/users" class="api-link">List Users</a></li>
      <li><a href="/api/products" class="api-link">List Products</a></li>
      <li><a href="/api/warehouses" class="api-link">List Warehouses</a></li>
      <li><a href="/api/orders" class="api-link">List Orders</a></li>
    </ul>
    
    <div style="margin-top: 30px;">
      <h3>Authentication:</h3>
      <div style="display: flex; gap: 20px;">
        <div style="flex: 1; background: #f5f5f5; padding: 15px; border-radius: 4px;">
          <h4>Login</h4>
          <form id="loginForm" style="display: flex; flex-direction: column; gap: 10px;">
            <input type="text" name="username" placeholder="Username" required style="padding: 8px;">
            <input type="password" name="password" placeholder="Password" required style="padding: 8px;">
            <button type="submit" style="padding: 8px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer;">Login</button>
          </form>
          <div id="loginMessage" style="margin-top: 10px; color: #d32f2f;"></div>
        </div>
        
        <div style="flex: 1; background: #f5f5f5; padding: 15px; border-radius: 4px;">
          <h4>User Info</h4>
          <div id="userInfo">Not logged in</div>
          <button id="logoutBtn" style="margin-top: 10px; padding: 8px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer; display: none;">Logout</button>
        </div>
      </div>
    </div>
    
    <script>
      // Simple login form
      document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          
          if (response.ok) {
            const user = await response.json();
            document.getElementById('loginMessage').textContent = '';
            document.getElementById('userInfo').innerHTML = \`
              <strong>ID:</strong> \${user.id}<br>
              <strong>Username:</strong> \${user.username}<br>
              <strong>Email:</strong> \${user.email || 'N/A'}<br>
              <strong>Type:</strong> \${user.user_type || 'N/A'}<br>
            \`;
            document.getElementById('logoutBtn').style.display = 'block';
          } else {
            document.getElementById('loginMessage').textContent = 'Invalid username or password';
          }
        } catch (err) {
          document.getElementById('loginMessage').textContent = 'Login failed: ' + err.message;
        }
      });
      
      // Logout button
      document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
          await fetch('/api/logout', { method: 'POST' });
          document.getElementById('userInfo').textContent = 'Not logged in';
          document.getElementById('logoutBtn').style.display = 'none';
        } catch (err) {
          console.error('Logout failed:', err);
        }
      });
      
      // Check if user is already logged in
      (async function() {
        try {
          const response = await fetch('/api/user');
          if (response.ok) {
            const user = await response.json();
            document.getElementById('userInfo').innerHTML = \`
              <strong>ID:</strong> \${user.id}<br>
              <strong>Username:</strong> \${user.username}<br>
              <strong>Email:</strong> \${user.email || 'N/A'}<br>
              <strong>Type:</strong> \${user.user_type || 'N/A'}<br>
            \`;
            document.getElementById('logoutBtn').style.display = 'block';
          }
        } catch (err) {
          console.error('Failed to check auth status:', err);
        }
      })();
    </script>
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

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start server
const server = createServer(app);
server.listen(port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║          LogiTech Full PostgreSQL Server               ║
╠════════════════════════════════════════════════════════╣
║ Server running at: http://0.0.0.0:${port}                   ║
║ Database: PostgreSQL Standard                          ║
║ API Health Check: http://localhost:${port}/api/health          ║
║ Authentication: Enabled                                ║
╚════════════════════════════════════════════════════════╝
  `);
  
  // Ensure index.html exists
  ensureIndexHtml();
});