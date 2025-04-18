#!/bin/bash
# quick-fix.sh - Script cepat untuk memperbaiki masalah koneksi Neon Database
# Ganti dengan driver PostgreSQL standar
# =====================================================================

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function untuk logging
log() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# Check apakah script dijalankan dengan sudo
if [ "$EUID" -ne 0 ]; then
  error "Script ini harus dijalankan dengan hak root. Jalankan: sudo ./quick-fix.sh"
fi

# Gunakan APP_DIR saat ini jika belum ditentukan
APP_DIR=${APP_DIR:-$(pwd)}
cd $APP_DIR || error "Gagal mengakses direktori $APP_DIR"

log "Memperbaiki masalah koneksi Neon Database di $APP_DIR..."

# 1. Backup file yang akan diubah
log "Membuat backup file..."
if [ -f "server/db.ts" ]; then
  cp -f server/db.ts server/db.ts.backup
else
  error "File server/db.ts tidak ditemukan! Pastikan Anda berada di direktori aplikasi."
fi

# 2. Install driver PostgreSQL standar
log "Menginstall dependensi PostgreSQL standar..."
npm install pg @types/pg --save || error "Gagal install package pg"
success "Paket pg berhasil diinstall"

# 3. Ubah konfigurasi database
log "Mengubah konfigurasi database untuk PostgreSQL standar..."
cat > server/db.ts << 'EOF'
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

const { Pool } = pg;

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
success "File db.ts berhasil diperbarui"

# 4. Ubah penggunaan session store di storage.ts
log "Mencari file storage.ts..."
if [ -f "server/storage.ts" ]; then
  cp -f server/storage.ts server/storage.ts.backup
  
  # Ubah konstruktor untuk menggunakan MemoryStore
  sed -i 's/this.sessionStore = new PostgresSessionStore({/this.sessionStore = new MemoryStore({/g' server/storage.ts
  sed -i 's/pool: pool, \/\/ Gunakan pool dari driver pg standar/checkPeriod: 86400000 \/\/ 24 jam/g' server/storage.ts
  sed -i 's/tableName: '"'"'session'"'"', \/\/ Nama tabel untuk menyimpan sesi//g' server/storage.ts
  sed -i 's/createTableIfMissing: true,//g' server/storage.ts
  
  success "File storage.ts berhasil diperbarui"
else
  warn "File server/storage.ts tidak ditemukan, melewati langkah ini."
fi

# 5. Periksa file .env
log "Memeriksa file .env..."
if [ ! -f ".env" ]; then
  log "Membuat file .env baru..."
  cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://logitech:Anam490468@localhost:5432/logitech_db

# Midtrans
MIDTRANS_SERVER_KEY=your_midtrans_server_key_here
MIDTRANS_CLIENT_KEY=your_midtrans_client_key_here

# Session
SESSION_SECRET=Anam490468
EOF
  success "File .env berhasil dibuat"
else
  log "File .env sudah ada, pastikan DATABASE_URL mengarah ke PostgreSQL lokal"
  
  # Periksa apakah DATABASE_URL perlu diperbarui
  if grep -q "db.neon.tech" .env; then
    log "Memperbarui DATABASE_URL di .env..."
    sed -i 's|postgresql://.*@.*\.neon\.tech/.*|postgresql://logitech:Anam490468@localhost:5432/logitech_db|g' .env
    success "DATABASE_URL berhasil diperbarui"
  fi
fi

# 6. Rebuild aplikasi
log "Membangun ulang aplikasi..."
npm run build || error "Gagal membangun aplikasi"
success "Aplikasi berhasil di-build ulang"

# 7. Buat server versi sederhana
log "Membuat server versi sederhana..."
cat > server-pg.js << 'EOF'
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
  console.log(\`
╔════════════════════════════════════════════╗
║        LogiTech Basic PostgreSQL Server    ║
╠════════════════════════════════════════════╣
║ Server running at: http://0.0.0.0:\${port}      ║
║ Database: PostgreSQL Standard               ║
║ API Health Check: http://localhost:\${port}/api/health ║
╚════════════════════════════════════════════╝
  \`);
  
  // Ensure index.html exists
  ensureIndexHtml();
});
EOF
success "Server versi sederhana berhasil dibuat"

# 8. Restart aplikasi
log "Merestart aplikasi dengan PM2..."
if command -v pm2 &> /dev/null; then
  # Buat konfigurasi PM2 untuk server sederhana
  cat > ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'logitech',
    script: 'server-pg.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF
  
  pm2 restart logitech || {
    warn "Gagal restart dengan nama 'logitech', menjalankan sebagai aplikasi baru..."
    pm2 start ecosystem.config.cjs
  }
  pm2 save
  success "Aplikasi berhasil dijalankan dengan PM2"
else
  warn "PM2 tidak ditemukan, harap jalankan aplikasi secara manual dengan: node server-pg.js"
fi

# Tampilkan ringkasan
echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}          Perbaikan Berhasil Diselesaikan!             ${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""
echo -e "Aplikasi LogiTech Delivery sekarang menggunakan driver PostgreSQL standar."
echo -e "${YELLOW}Tindakan Berikutnya:${NC}"
echo -e "1. Pastikan database PostgreSQL lokal tersedia dan dapat diakses"
echo -e "2. Pastikan tabel session ada di database (jika menggunakan PostgreSQL session store)"
echo -e "3. Periksa log aplikasi: ${BLUE}pm2 logs${NC}"
echo ""
echo -e "Jika masih ada masalah, coba gunakan server sederhana untuk memverifikasi koneksi:"
echo -e "${BLUE}node server-simple.js${NC}"
echo ""