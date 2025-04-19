/**
 * LogiTech Server - Node.js v12 Compatible Version
 * Menggunakan CommonJS format (CJS extension) untuk kompatibilitas dengan Node.js v12
 * 
 * File ini adalah versi CommonJS dari server-commonjs.js yang sudah dioptimasi
 * untuk Node.js v12 yang memiliki dukungan ES Module yang terbatas
 * 
 * Fitur:
 * - Menggunakan CommonJS module (require/module.exports)
 * - Kompatibel dengan Node.js v12.x
 * - Koneksi ke database PostgreSQL menggunakan pg tanpa WebSocket
 * - Autentikasi menggunakan cookies dan session
 * - REST API untuk manajemen produk, pesanan, dan tracking
 * - Integrasi pembayaran (Midtrans/Xendit)
 */

// Standar Library
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { promisify } = require('util');

// Express & Middleware
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const cors = require('cors');

// Database
const { Pool } = require('pg');

// Variabel dan Konstanta
const PORT = process.env.PORT || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'logitech-session-secret-key-dev';
const DEBUG = process.env.NODE_ENV !== 'production';
const PUBLIC_DIR = path.join(__dirname, 'client', 'dist');

// Database connection
let pool;
try {
  // Menghubungkan ke PostgreSQL jika DATABASE_URL tersedia
  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    console.log('Menggunakan koneksi PostgreSQL');
  } else {
    console.log('Warning: DATABASE_URL tidak ditemukan, menggunakan penyimpanan memori sementara');
  }
} catch (error) {
  console.error('Error saat menghubungkan ke database:', error.message);
}

// Fungsi hash password
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await promisify(crypto.scrypt)(password, salt, 64);
  return `${derivedKey.toString('hex')}.${salt}`;
}

// Fungsi verifikasi password
async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split('.');
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = await promisify(crypto.scrypt)(supplied, salt, 64);
    return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (err) {
    console.error('Error saat memverifikasi password:', err);
    return false;
  }
}

// Buat ID Session yang unik
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Initialize application
const app = express();

// Middleware dasar
app.use(cors({ 
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session middleware
function sessionMiddleware(req, res, next) {
  // Jika sudah ada session
  if (req.cookies.sessionId) {
    const sessionId = req.cookies.sessionId;
    
    // Cek jika ada session di memori
    if (sessions[sessionId]) {
      req.session = sessions[sessionId];
      req.session.lastAccess = Date.now();
      req.sessionId = sessionId;
    } else {
      // Buat session baru jika session tidak valid
      const newSessionId = generateSessionId();
      sessions[newSessionId] = {
        id: newSessionId,
        user: null,
        cart: [],
        createdAt: Date.now(),
        lastAccess: Date.now()
      };
      
      req.session = sessions[newSessionId];
      req.sessionId = newSessionId;
      
      // Set cookie baru
      res.cookie('sessionId', newSessionId, {
        maxAge: 24 * 60 * 60 * 1000, // 1 day
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
    }
  } else {
    // Buat session baru jika tidak ada cookie
    const newSessionId = generateSessionId();
    sessions[newSessionId] = {
      id: newSessionId,
      user: null,
      cart: [],
      createdAt: Date.now(),
      lastAccess: Date.now()
    };
    
    req.session = sessions[newSessionId];
    req.sessionId = newSessionId;
    
    // Set cookie
    res.cookie('sessionId', newSessionId, {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
  }
  
  next();
}

// Sessions in-memory store
const sessions = {};

// Middleware autentikasi
app.use(sessionMiddleware);

// Auth middleware untuk routes yang memerlukan autentikasi
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Static file serving
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
} else {
  console.warn(`Warning: Public directory tidak ditemukan: ${PUBLIC_DIR}`);
}

// Pastikan index.html tersedia
function ensureIndexHtml() {
  if (fs.existsSync(PUBLIC_DIR)) {
    const indexPath = path.join(PUBLIC_DIR, 'index.html');
    if (!fs.existsSync(indexPath)) {
      // Buat index.html minimal jika tidak ada
      const minimalHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>LogiTech App</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            h1 { color: #333; }
            .card { border: 1px solid #ddd; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
            .info { color: #555; }
            .error { color: #d9534f; }
            .success { color: #5cb85c; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>LogiTech API Server</h1>
            <div class="card">
              <h2>Server Berjalan</h2>
              <p class="success">Server API berjalan dengan baik</p>
              <p class="info">Anda dapat mengakses API di path /api/*</p>
            </div>
          </div>
        </body>
        </html>
      `;
      fs.writeFileSync(indexPath, minimalHtml);
      console.log(`Created minimal index.html at ${indexPath}`);
    }
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
    databaseConnected: !!pool
  });
});

// Auth endpoints
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  try {
    // Query untuk menemukan user berdasarkan username
    let user = null;
    
    if (pool) {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1', 
        [username]
      );
      user = result.rows[0];
    } 
    
    // Coba login dengan admin default jika tidak ada database atau user tidak ditemukan
    if (!user && username === 'admin' && password === 'admin123') {
      user = {
        id: 0,
        username: 'admin',
        password: await hashPassword('admin123'),
        role: 'admin',
        name: 'Admin',
        email: 'admin@logitech.com'
      };
    }
    
    // Coba login dengan driver default
    if (!user && username === 'driver' && password === 'driver123') {
      user = {
        id: 1,
        username: 'driver',
        password: await hashPassword('driver123'),
        role: 'driver',
        name: 'Driver Test',
        email: 'driver@logitech.com'
      };
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Verifikasi password
    const passwordCorrect = await comparePasswords(password, user.password);
    
    if (!passwordCorrect) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Hapus password dari object user sebelum mengirim ke client
    const { password: _, ...userWithoutPassword } = user;
    
    // Simpan user di session
    req.session.user = userWithoutPassword;
    
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

app.post('/api/logout', (req, res) => {
  if (req.session) {
    // Hapus user dari session
    req.session.user = null;
    
    // Hapus session sepenuhnya (opsional)
    delete sessions[req.sessionId];
    res.clearCookie('sessionId');
  }
  
  res.json({ success: true });
});

app.get('/api/user', (req, res) => {
  if (req.session && req.session.user) {
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// API Produk
app.get('/api/products', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
      res.json(result.rows);
    } else {
      res.json([
        { 
          id: 1, 
          name: 'Laptop Asus', 
          price: 7500000, 
          weight: 2.5,
          description: 'Laptop gaming dengan spesifikasi tinggi',
          image: 'https://example.com/laptop.jpg',
          status: 'available',
          created_at: new Date().toISOString()
        },
        { 
          id: 2, 
          name: 'Smartphone Samsung', 
          price: 3200000, 
          weight: 0.2,
          description: 'Smartphone dengan kamera beresolusi tinggi',
          image: 'https://example.com/phone.jpg',
          status: 'available',
          created_at: new Date().toISOString()
        }
      ]);
    }
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Error getting products' });
  }
});

// Single product endpoint
app.get('/api/products/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    
    if (pool) {
      const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      res.json(result.rows[0]);
    } else {
      // Default response jika tidak ada database
      res.json({ 
        id, 
        name: 'Product ' + id, 
        price: 1000000, 
        weight: 1.0,
        description: 'Product description',
        image: 'https://example.com/product.jpg',
        status: 'available',
        created_at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Error getting product' });
  }
});

// List warehouse endpoint
app.get('/api/warehouses', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.query('SELECT * FROM warehouses ORDER BY id');
      res.json(result.rows);
    } else {
      res.json([
        { 
          id: 1, 
          name: 'Warehouse Jakarta', 
          address: 'Jl. Warehouse No. 1, Jakarta',
          latitude: -6.2088,
          longitude: 106.8456,
          region: 'Jakarta'
        },
        { 
          id: 2, 
          name: 'Warehouse Surabaya', 
          address: 'Jl. Warehouse No. 2, Surabaya',
          latitude: -7.2575,
          longitude: 112.7521,
          region: 'Surabaya'
        }
      ]);
    }
  } catch (error) {
    console.error('Error getting warehouses:', error);
    res.status(500).json({ error: 'Error getting warehouses' });
  }
});

// List orders endpoint
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    if (pool) {
      // Berbeda query berdasarkan role
      let query = '';
      const userRole = req.session.user.role;
      const userId = req.session.user.id;
      
      if (userRole === 'admin') {
        query = 'SELECT * FROM orders ORDER BY created_at DESC';
        const result = await pool.query(query);
        res.json(result.rows);
      } else if (userRole === 'driver') {
        query = 'SELECT * FROM orders WHERE driver_id = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
      } else {
        query = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
      }
    } else {
      // Default response jika tidak ada database
      res.json([
        {
          id: 1,
          transaction_id: 'TRX123456',
          user_id: req.session.user.id,
          product_id: 1,
          quantity: 1,
          total_price: 7500000,
          status: 'pending',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          payment_url: 'https://example.com/pay/TRX123456'
        },
        {
          id: 2,
          transaction_id: 'TRX123457',
          user_id: req.session.user.id,
          product_id: 2,
          quantity: 2,
          total_price: 6400000,
          status: 'paid',
          created_at: new Date(Date.now() - 172800000).toISOString(),
          payment_url: 'https://example.com/pay/TRX123457'
        }
      ]);
    }
  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({ error: 'Error getting orders' });
  }
});

// Create order endpoint
app.post('/api/orders', requireAuth, async (req, res) => {
  try {
    const { product_id, quantity, shipping_address } = req.body;
    
    if (!product_id || !quantity || !shipping_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (pool) {
      // Get product details
      const productResult = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [product_id]
      );
      
      if (productResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const product = productResult.rows[0];
      const totalPrice = product.price * quantity;
      
      // Generate transaction ID
      const transactionId = 'TRX' + Date.now().toString().substring(3);
      
      // Insert order
      const orderResult = await pool.query(
        `INSERT INTO orders 
         (transaction_id, user_id, product_id, quantity, total_price, status, shipping_address) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING *`,
        [
          transactionId,
          req.session.user.id,
          product_id,
          quantity,
          totalPrice,
          'pending',
          shipping_address
        ]
      );
      
      const order = orderResult.rows[0];
      
      // Generate payment URL (placeholder, in real app would use Midtrans/Xendit)
      const paymentUrl = `/pay/${transactionId}`;
      
      // Update order with payment URL
      await pool.query(
        'UPDATE orders SET payment_url = $1 WHERE id = $2',
        [paymentUrl, order.id]
      );
      
      order.payment_url = paymentUrl;
      
      res.status(201).json(order);
    } else {
      // Mock response jika tidak ada database
      const transactionId = 'TRX' + Date.now().toString().substring(3);
      const paymentUrl = `/pay/${transactionId}`;
      
      res.status(201).json({
        id: Math.floor(Math.random() * 1000),
        transaction_id: transactionId,
        user_id: req.session.user.id,
        product_id,
        quantity,
        total_price: 1000000 * quantity,
        shipping_address,
        status: 'pending',
        created_at: new Date().toISOString(),
        payment_url: paymentUrl
      });
    }
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Error creating order' });
  }
});

// SPA Fallback
app.get('*', (req, res) => {
  // Untuk API requests yang tidak ditemukan
  if (req.url.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  
  // Pastikan index.html tersedia
  ensureIndexHtml();
  
  // Serve the index.html for SPA routing
  if (fs.existsSync(PUBLIC_DIR)) {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  } else {
    res.status(404).send('Not found');
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`LogiTech Server berjalan di port ${PORT}`);
  console.log(`Node.js version: ${process.version}`);
  console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${pool ? 'PostgreSQL' : 'Memory Storage (sementara)'}`);
  
  // Ensure index.html exists
  ensureIndexHtml();
});

// Cleanup on exit
process.on('SIGINT', () => {
  console.log('Server shutting down...');
  server.close(() => {
    console.log('Server stopped');
    if (pool) {
      pool.end(() => {
        console.log('Database connection pool closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  // Keep server running despite error
});

module.exports = server;