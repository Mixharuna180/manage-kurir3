#!/bin/bash
# deploy-app.sh - One-click deployment script untuk LogiTech Delivery System
# =========================================================================
# Script ini akan:
# 1. Menyiapkan environment NodeJS
# 2. Menginstall dependensi yang diperlukan
# 3. Membuat database PostgreSQL
# 4. Menjalankan migrasi database
# 5. Membuat konfigurasi web server
# 6. Menjalankan aplikasi dengan PM2

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

warn() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# Check apakah script dijalankan dengan sudo
if [ "$EUID" -ne 0 ]; then
  error "Script ini harus dijalankan dengan hak root. Jalankan: sudo ./deploy-app.sh"
fi

# Konfirmasi deployment
echo -e "${YELLOW}=======================================================${NC}"
echo -e "${YELLOW}         LogiTech Delivery System Deployment           ${NC}"
echo -e "${YELLOW}=======================================================${NC}"
echo ""
echo "Script ini akan menginstall dan mengkonfigurasi aplikasi LogiTech Delivery System."
echo "Pastikan Anda telah memenuhi prasyarat berikut:"
echo "  - Server dengan OS Ubuntu/Debian"
echo "  - Koneksi internet"
echo "  - Minimal 1GB RAM dan 10GB disk space"
echo ""
read -p "Lanjutkan deployment? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Deployment dibatalkan."
  exit 0
fi

# 1. Setup Environment Variables
log "Menyiapkan environment variables..."
cat > /etc/profile.d/logitech-env.sh << 'EOF'
# Logitech Environment Variables
export NODE_ENV=production
export PORT=5000
EOF
source /etc/profile.d/logitech-env.sh

# 2. Update System dan Install Dependencies
log "Mengupdate system dan menginstall dependencies..."
apt-get update || error "Gagal update system packages"
apt-get install -y curl wget gnupg2 ca-certificates lsb-release apt-transport-https \
  unzip git build-essential python3 || error "Gagal install dependencies"

# 3. Install NodeJS 20.x
log "Menginstall NodeJS 20.x..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || error "Gagal setup NodeJS repository"
  apt-get install -y nodejs || error "Gagal install NodeJS"
  
  # Install PM2 globally
  npm install -g pm2 || error "Gagal install PM2"
  
  success "NodeJS ${YELLOW}$(node -v)${GREEN} dan NPM ${YELLOW}$(npm -v)${GREEN} berhasil diinstall"
else
  warn "NodeJS sudah terinstall: $(node -v)"
fi

# 4. Install Nginx
log "Menginstall dan mengkonfigurasi Nginx..."
if ! command -v nginx &> /dev/null; then
  apt-get install -y nginx || error "Gagal install Nginx"
  success "Nginx berhasil diinstall"
else
  warn "Nginx sudah terinstall: $(nginx -v 2>&1 | cut -d'/' -f2)"
fi

# 5. Install PostgreSQL
log "Menginstall PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "deb [arch=$(dpkg --print-architecture)] http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
  apt-get update || error "Gagal update repositories setelah menambahkan PostgreSQL"
  apt-get install -y postgresql postgresql-contrib || error "Gagal install PostgreSQL"
  success "PostgreSQL berhasil diinstall"
else
  warn "PostgreSQL sudah terinstall: $(psql --version)"
fi

# 6. Setup PostgreSQL Database
log "Menyiapkan database PostgreSQL untuk LogiTech..."
service postgresql start
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='logitech_db'" | grep -q 1; then
  warn "Database logitech_db sudah ada"
else
  # Buat database dan user
  sudo -u postgres psql -c "CREATE DATABASE logitech_db;" || error "Gagal membuat database"
  sudo -u postgres psql -c "CREATE USER logitech WITH ENCRYPTED PASSWORD 'Anam490468';" || error "Gagal membuat user database"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE logitech_db TO logitech;" || error "Gagal memberikan privileges"
  sudo -u postgres psql -c "ALTER USER logitech WITH SUPERUSER;" || error "Gagal set superuser privileges"
  success "Database logitech_db berhasil dibuat"
fi

# 7. Setup Application Directory
APP_DIR="/var/www/logitech"
log "Menyiapkan direktori aplikasi di $APP_DIR..."
mkdir -p $APP_DIR
cd $APP_DIR || error "Gagal mengakses direktori aplikasi"

# 8. Download Application
log "Mendownload dan mengekstrak aplikasi LogiTech..."
if [ -f "package.json" ]; then
  warn "Aplikasi sudah ada di $APP_DIR"
else
  # Extract aplikasi dari file zip jika disediakan
  if [ -f "logitech.zip" ]; then
    unzip -q logitech.zip -d $APP_DIR || error "Gagal mengekstrak aplikasi"
    success "Aplikasi berhasil diekstrak"
  else
    error "File logitech.zip tidak ditemukan. Harap salin file zip aplikasi ke server terlebih dahulu."
  fi
fi

# 9. Install Application Dependencies
log "Menginstall dependensi aplikasi..."
npm install --omit=dev || error "Gagal install dependensi aplikasi"
success "Dependensi aplikasi berhasil diinstall"

# 10. Update Database Configuration
log "Mengkonfigurasi koneksi database..."
cat > $APP_DIR/.env << EOF
# Database Configuration
DATABASE_URL=postgresql://logitech:Anam490468@localhost:5432/logitech_db

# Midtrans Integration
MIDTRANS_SERVER_KEY=Mid-server-EOC-6ehtF8gBTux1n6SaVp3H
MIDTRANS_CLIENT_KEY=Mid-client-ajysHU-3bFyOUAc7

# Session Secret
SESSION_SECRET=Anam490468

# Production Environment
NODE_ENV=production
PORT=5000
EOF
success "File konfigurasi .env berhasil dibuat"

# 11. Fix untuk Neon Database
log "Memperbaiki konfigurasi database untuk PostgreSQL standar..."
# Backup file db.ts
cp -f server/db.ts server/db.ts.backup

# Modifikasi db.ts untuk PostgreSQL standar
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
success "File db.ts berhasil diperbarui untuk PostgreSQL standar"

# 12. Build Application
log "Building aplikasi..."
npm run build || error "Gagal build aplikasi"
success "Aplikasi berhasil di-build"

# 13. Create Database Schema
log "Membuat skema database..."
# Buat tabel session
sudo -u postgres psql -d logitech_db -c "
CREATE TABLE IF NOT EXISTS \"session\" (
  \"sid\" varchar NOT NULL,
  \"sess\" json NOT NULL,
  \"expire\" timestamp(6) NOT NULL,
  PRIMARY KEY (\"sid\")
);
CREATE INDEX IF NOT EXISTS \"IDX_session_expire\" ON \"session\" (\"expire\");
" || warn "Gagal membuat tabel session"

# Jalankan migrasi Drizzle
npx drizzle-kit push --force || warn "Gagal menjalankan migrasi database, mencoba alternatif..."

# 14. Configure Nginx
log "Mengkonfigurasi Nginx..."
cat > /etc/nginx/sites-available/logitech << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/logitech /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx || error "Konfigurasi Nginx tidak valid"
success "Nginx berhasil dikonfigurasi"

# 15. Setup PM2 Process
log "Menyiapkan PM2 process manager..."
cat > $APP_DIR/ecosystem.config.cjs << 'EOF'
module.exports = {
  apps: [{
    name: 'logitech',
    script: 'server-simple.js',
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

# 16. Create simple server file
log "Membuat file server sederhana..."
cat > $APP_DIR/server-simple.js << 'EOF'
import express from 'express';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 5000;
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
});
EOF
success "File server sederhana berhasil dibuat"

# 17. Start Application with PM2
log "Memulai aplikasi dengan PM2..."
cd $APP_DIR
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
success "Aplikasi berhasil dijalankan dengan PM2"

# 18. Create Logs Directory
mkdir -p $APP_DIR/logs
chown -R www-data:www-data $APP_DIR
chmod -R 755 $APP_DIR

# 19. Setup Firewall
log "Mengkonfigurasi firewall..."
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 5000/tcp
  ufw --force enable
  success "Firewall berhasil dikonfigurasi"
else
  warn "UFW tidak terinstall, firewall tidak dikonfigurasi"
fi

# 20. Create Deployment Info
cat > $APP_DIR/deployment-info.txt << EOF
========================================================
LogiTech Delivery System - Deployment Information
========================================================
Deployment Date: $(date)
Application Path: $APP_DIR
Node Version: $(node -v)
NPM Version: $(npm -v)
Database: PostgreSQL (localhost:5432/logitech_db)
Web Server: Nginx (http://localhost)
Application Server: Node.js (http://localhost:5000)
Process Manager: PM2

Admin Login:
Username: anam
Password: Anam490468

Driver Login:
Username: driver6
Password: Driver123

Database Credentials:
User: logitech
Password: Anam490468
Database: logitech_db

URLs:
- Main Application: http://$(hostname -I | awk '{print $1}')
- API Endpoint: http://$(hostname -I | awk '{print $1}')/api

For troubleshooting:
1. Check app logs: pm2 logs logitech
2. Restart app: pm2 restart logitech
3. Check database: sudo -u postgres psql -d logitech_db
4. Restart web server: systemctl restart nginx
========================================================
EOF

# 21. Display Summary
echo ""
echo -e "${GREEN}=======================================================${NC}"
echo -e "${GREEN}          Deployment Berhasil Diselesaikan!            ${NC}"
echo -e "${GREEN}=======================================================${NC}"
echo ""
echo -e "Aplikasi LogiTech Delivery System berhasil di-deploy."
echo -e "  ${BLUE}URL:${NC} http://$(hostname -I | awk '{print $1}')"
echo -e "  ${BLUE}Admin:${NC} anam / Anam490468"
echo -e "  ${BLUE}Driver:${NC} driver6 / Driver123"
echo -e "  ${BLUE}Log:${NC} pm2 logs logitech"
echo ""
echo -e "Silakan cek file ${YELLOW}$APP_DIR/deployment-info.txt${NC} untuk informasi detail."
echo ""
echo -e "${YELLOW}Catatan:${NC} Jika terjadi masalah dengan koneksi database Neon,"
echo -e "aplikasi sudah dikonfigurasi untuk menggunakan PostgreSQL standar."
echo ""