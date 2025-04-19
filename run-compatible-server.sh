#!/bin/bash
# run-compatible-server.sh - Script untuk menjalankan server kompatibel

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

log "Instalasi dependensi cookie-parser..."
npm install cookie-parser --save || error "Gagal menginstall cookie-parser"

# Periksa apakah server sudah berjalan
if [ -f "server.pid" ]; then
  PID=$(cat server.pid)
  if ps -p $PID > /dev/null; then
    warn "Server sudah berjalan dengan PID: $PID"
    exit 0
  else
    log "PID lama tidak valid, menghapus file PID..."
    rm server.pid
  fi
fi

# Jalankan server compatible baru
log "Menjalankan server kompatibel..."
nohup node server-compatible.js > server.log 2>&1 &
PID=$!
echo $PID > server.pid

sleep 2
if ps -p $PID > /dev/null; then
  success "Server berhasil dimulai dengan PID: $PID"
  log "Server logs: ./server.log"
  log "Akses server di: http://localhost:5000 atau http://SERVER_IP:5000"
else
  error "Gagal memulai server!"
  exit 1
fi

log "Menunggu 5 detik untuk memastikan server berjalan dengan baik..."
sleep 5

if ps -p $PID > /dev/null; then
  success "Server berjalan dengan stabil"
  log "Untuk memeriksa status server: ./manage-server.sh status"
  log "Untuk melihat log server: ./manage-server.sh logs"
  log "Untuk menghentikan server: ./manage-server.sh stop"
else
  error "Server gagal berjalan stabil, silakan periksa log di server.log"
  cat server.log | tail -n 20
  exit 1
fi

exit 0