#!/bin/bash
# clean-dependencies.sh - Script untuk membersihkan dependensi yang gagal

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
}

echo -e "${YELLOW}===============================================${NC}"
echo -e "${YELLOW}LogiTech - Pembersihan Dependensi${NC}"
echo -e "${YELLOW}===============================================${NC}"

if [ ! -f "package.json" ]; then
  warn "Tidak ada file package.json, membuat file baru"
  echo '{
  "name": "logitech-delivery",
  "version": "1.0.0",
  "description": "LogiTech Delivery System",
  "main": "server-legacy.js",
  "scripts": {
    "start": "node server-legacy.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "pg": "^8.7.1"
  }
}' > package.json
  success "File package.json berhasil dibuat"
fi

log "Memeriksa status server..."
if [ -f "server.pid" ]; then
  PID=$(cat server.pid)
  if ps -p $PID > /dev/null; then
    warn "Server sedang berjalan (PID: $PID), menghentikan terlebih dahulu..."
    kill $PID
    sleep 2
    
    if ps -p $PID > /dev/null; then
      warn "Server tidak merespon, mencoba force kill..."
      kill -9 $PID
      sleep 1
    fi
    
    if ps -p $PID > /dev/null; then
      error "Gagal menghentikan server! Hentikan manual dengan: kill -9 $PID"
    else
      success "Server berhasil dihentikan"
      rm -f server.pid
    fi
  else
    log "Server tidak berjalan, menghapus file PID yang tidak valid"
    rm -f server.pid
  fi
fi

log "Menghapus node_modules jika ada..."
if [ -d "node_modules" ]; then
  rm -rf node_modules
  if [ $? -eq 0 ]; then
    success "Berhasil menghapus node_modules"
  else
    error "Gagal menghapus node_modules, coba hapus manual: rm -rf node_modules"
  fi
else
  log "Direktori node_modules tidak ditemukan"
fi

log "Menghapus package-lock.json jika ada..."
if [ -f "package-lock.json" ]; then
  rm -f package-lock.json
  success "Berhasil menghapus package-lock.json"
fi

log "Menginstall dependensi dasar yang diperlukan..."
npm install express pg --save
if [ $? -eq 0 ]; then
  success "Berhasil menginstall dependensi dasar"
else
  error "Gagal menginstall dependensi dasar"
fi

echo -e "\n${YELLOW}===============================================${NC}"
echo -e "${GREEN}Pembersihan selesai!${NC}"
echo -e "${YELLOW}===============================================${NC}"
echo -e "Sekarang Anda dapat menjalankan server dengan salah satu command:"
echo -e " - ${BLUE}./run-legacy-server.sh${NC} (Direkomendasikan)"
echo -e " - ${BLUE}./manage-server.sh start${NC} (Jika ingin menggunakan manage-server)"
echo -e " - ${BLUE}node server-legacy.js${NC} (Jika ingin menjalankan langsung)"
echo -e "\nGunakan ${BLUE}git pull${NC} untuk mendapatkan update terbaru dari repository"