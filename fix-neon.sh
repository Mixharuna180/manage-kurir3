#!/bin/bash
# fix-neon.sh - Script untuk memperbaiki koneksi Neon Database ke PostgreSQL standard

# Pastikan script dijalankan dengan hak root
if [ "$EUID" -ne 0 ]; then
  echo "Script ini harus dijalankan dengan hak root (sudo)"
  exit 1
fi

# Tentukan direktori aplikasi
APP_DIR="/var/www/logitech"
cd $APP_DIR || { echo "Direktori $APP_DIR tidak ditemukan!"; exit 1; }

# 1. Backup file yang akan diubah
echo "Membuat backup file..."
cp -f server/db.ts server/db.ts.backup
cp -f package.json package.json.backup

# 2. Install dependensi PostgreSQL standar
echo "Menginstall dependensi PostgreSQL standar..."
npm install pg @types/pg --save

# 3. Modifikasi file db.ts untuk menggunakan PostgreSQL standar
echo "Mengubah konfigurasi database..."
cat > server/db.ts << 'EOF'
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Gunakan driver PostgreSQL standar, bukan Neon WebSocket
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false // Matikan SSL untuk koneksi lokal
});

export const db = drizzle(pool, { schema });
EOF

# 4. Pastikan file .env memiliki koneksi database lokal
echo "Memeriksa file .env..."
if [ ! -f .env ]; then
  echo "Membuat file .env..."
  cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://logitech:Anam490468@localhost:5432/logitech_db

# Midtrans
MIDTRANS_SERVER_KEY=Mid-server-EOC-6ehtF8gBTux1n6SaVp3H
MIDTRANS_CLIENT_KEY=Mid-client-ajysHU-3bFyOUAc7

# Session
SESSION_SECRET=Anam490468
EOF
fi

# 5. Buat server versi sederhana untuk pengujian
echo "Membuat file server sederhana untuk pengujian..."
cat > server-simple.js << 'EOF'
import express from 'express';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = 5000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi database standar
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist', 'client')));

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LogiTech Delivery</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #0066cc; }
          .container { border: 1px solid #ddd; padding: 20px; border-radius: 5px; }
          .panel { background: #f8f9fa; padding: 15px; margin-top: 20px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>LogiTech Delivery System</h1>
        <div class="container">
          <h2>Server Status</h2>
          <p>Server berjalan dengan PostgreSQL standar</p>
          
          <div class="panel">
            <h3>Database Info</h3>
            <p>Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}</p>
            <p><a href="/api/health">Check API Health</a></p>
            <p><a href="/api/dbtest">Test Database Connection</a></p>
          </div>
        </div>
      </body>
    </html>
  `);
});

// API health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server berjalan dengan baik'
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
      dbUrl: process.env.DATABASE_URL ? 'Configured (value hidden)' : 'Missing'
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: err.message
    });
  }
});

// Catchall route for SPA
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'dist', 'client', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('Application is running, but client files are not found.');
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
});
EOF

# 6. Build ulang aplikasi
echo "Build ulang aplikasi..."
npm run build

# 7. Restart aplikasi dengan PM2
echo "Restart aplikasi..."
pm2 stop logitech
pm2 delete logitech
pm2 start server-simple.js --name logitech
pm2 save

echo "Selesai! Aplikasi sekarang menggunakan PostgreSQL standar."
echo "Server diagnostik berjalan di http://server-ip:5000/"
echo "Jika berhasil, restart aplikasi utama: pm2 stop logitech && pm2 start ecosystem.config.cjs --env production"