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
MIDTRANS_SERVER_KEY=Mid-server-EOC-6ehtF8gBTux1n6SaVp3H
MIDTRANS_CLIENT_KEY=Mid-client-ajysHU-3bFyOUAc7

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

# 7. Restart aplikasi
log "Merestart aplikasi dengan PM2..."
if command -v pm2 &> /dev/null; then
  pm2 restart logitech || warn "Gagal restart dengan nama 'logitech', mencoba alternatif..."
  pm2 restart all || warn "Gagal restart semua aplikasi PM2"
  success "Aplikasi berhasil direstart dengan PM2"
else
  warn "PM2 tidak ditemukan, harap restart aplikasi secara manual"
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