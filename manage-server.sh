#!/bin/bash
# manage-server.sh - Script untuk mengelola server LogiTech tanpa PM2
# Perintah: ./manage-server.sh [start|stop|restart|status|logs]

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

# Function untuk memulai server
start_server() {
  log "Memulai server LogiTech..."
  
  # Periksa apakah server sudah berjalan
  if [ -f "server.pid" ]; then
    PID=$(cat server.pid)
    if ps -p $PID > /dev/null; then
      warn "Server sudah berjalan dengan PID: $PID"
      return 0
    else
      log "Server PID tidak valid, menghapus file PID..."
      rm server.pid
    fi
  fi
  
  # Periksa apakah file server ada
  if [ ! -f "server-simple.js" ]; then
    error "File server-simple.js tidak ditemukan!"
    return 1
  fi
  
  # Mulai server
  log "Menjalankan server sebagai daemon..."
  nohup node server-simple.js > server.log 2>&1 &
  PID=$!
  echo $PID > server.pid
  
  # Periksa apakah server berhasil dimulai
  sleep 2
  if ps -p $PID > /dev/null; then
    success "Server berhasil dimulai dengan PID: $PID"
    log "Server logs: ./server.log"
    log "Akses server di: http://localhost:5000 atau http://SERVER_IP:5000"
  else
    error "Gagal memulai server!"
    return 1
  fi
}

# Function untuk menghentikan server
stop_server() {
  log "Menghentikan server LogiTech..."
  
  # Periksa apakah server berjalan
  if [ ! -f "server.pid" ]; then
    warn "File PID tidak ditemukan, server mungkin tidak berjalan"
    # Cari proses server jika ada
    PID=$(ps aux | grep '[n]ode.*server-simple' | awk '{print $2}')
    if [ -z "$PID" ]; then
      warn "Tidak ada proses server yang berjalan"
      return 0
    else
      log "Proses server ditemukan dengan PID: $PID"
    fi
  else
    PID=$(cat server.pid)
    log "PID server: $PID"
  fi
  
  # Hentikan proses
  if [ ! -z "$PID" ]; then
    kill -15 $PID
    sleep 2
    
    # Periksa apakah proses sudah berhenti
    if ps -p $PID > /dev/null; then
      warn "Server tidak merespons, mencoba force kill..."
      kill -9 $PID
      sleep 1
    fi
    
    # Periksa lagi
    if ps -p $PID > /dev/null; then
      error "Gagal menghentikan server dengan PID: $PID"
      return 1
    else
      success "Server berhasil dihentikan"
      rm -f server.pid
    fi
  fi
}

# Function untuk me-restart server
restart_server() {
  log "Me-restart server LogiTech..."
  stop_server
  sleep 2
  start_server
}

# Function untuk melihat status server
check_status() {
  log "Status server LogiTech:"
  
  # Periksa PID file
  if [ -f "server.pid" ]; then
    PID=$(cat server.pid)
    log "PID file ditemukan: $PID"
    
    # Periksa apakah proses masih berjalan
    if ps -p $PID > /dev/null; then
      success "Server berjalan dengan PID: $PID"
      
      # Periksa port 5000
      if netstat -tuln | grep -q ":5000"; then
        log "Server mendengarkan port 5000"
      else
        warn "Server berjalan tapi tidak mendengarkan port 5000"
      fi
      
      # Get server uptime
      STARTED=$(ps -p $PID -o lstart= 2>/dev/null)
      if [ ! -z "$STARTED" ]; then
        log "Server dimulai pada: $STARTED"
      fi
      
      return 0
    else
      warn "PID $PID tidak lagi berjalan, server mungkin crash"
      
      # Cari proses server jika ada
      NEW_PID=$(ps aux | grep '[n]ode.*server-simple' | awk '{print $2}')
      if [ ! -z "$NEW_PID" ]; then
        warn "Server berjalan dengan PID berbeda: $NEW_PID"
        echo $NEW_PID > server.pid
        log "File PID diupdate"
        return 0
      else
        error "Server tidak berjalan!"
        rm -f server.pid
        return 1
      fi
    fi
  else
    warn "File PID tidak ditemukan"
    
    # Cari proses server jika ada
    PID=$(ps aux | grep '[n]ode.*server-simple' | awk '{print $2}')
    if [ ! -z "$PID" ]; then
      warn "Server berjalan tanpa file PID dengan PID: $PID"
      echo $PID > server.pid
      log "File PID dibuat"
      return 0
    else
      error "Server tidak berjalan!"
      return 1
    fi
  fi
}

# Function untuk melihat logs server
view_logs() {
  log "Logs server LogiTech:"
  
  if [ -f "server.log" ]; then
    tail -n 100 server.log
  else
    error "File log tidak ditemukan!"
    return 1
  fi
}

# Function untuk melihat logs server secara real-time
follow_logs() {
  log "Following server logs (CTRL+C untuk keluar):"
  
  if [ -f "server.log" ]; then
    tail -f server.log
  else
    error "File log tidak ditemukan!"
    return 1
  fi
}

# Tampilkan pesan penggunaan jika tidak ada argumen
if [ $# -eq 0 ]; then
  echo -e "${BLUE}Penggunaan: $0 [command]${NC}"
  echo -e "  ${YELLOW}start${NC}    - Memulai server"
  echo -e "  ${YELLOW}stop${NC}     - Menghentikan server"
  echo -e "  ${YELLOW}restart${NC}  - Me-restart server"
  echo -e "  ${YELLOW}status${NC}   - Melihat status server"
  echo -e "  ${YELLOW}logs${NC}     - Melihat 100 baris terakhir log server"
  echo -e "  ${YELLOW}follow${NC}   - Melihat log server secara real-time"
  exit 0
fi

# Eksekusi command
case "$1" in
  start)
    start_server
    ;;
  stop)
    stop_server
    ;;
  restart)
    restart_server
    ;;
  status)
    check_status
    ;;
  logs)
    view_logs
    ;;
  follow)
    follow_logs
    ;;
  *)
    error "Command tidak dikenal: $1"
    echo -e "Gunakan: $0 [start|stop|restart|status|logs|follow]"
    exit 1
    ;;
esac