#!/bin/bash
# Script untuk menjalankan server Node.js v12 compatible
# Menggunakan server-node12.cjs yang diformat sebagai CommonJS

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}LogiTech - Server Compatible Node.js v12${NC}"

# Periksa versi Node.js
NODE_VERSION=$(node --version 2>/dev/null)
if [ -z "$NODE_VERSION" ]; then
  echo -e "${RED}Error: Node.js tidak terinstal${NC}"
  exit 1
fi

echo -e "Versi Node.js: ${GREEN}$NODE_VERSION${NC}"
if [[ "$NODE_VERSION" =~ ^v12 ]]; then
  echo -e "${YELLOW}Menjalankan di Node.js v12 mode${NC}"
else
  echo -e "${YELLOW}Menjalankan di Node.js $NODE_VERSION (mode kompatibilitas dengan v12)${NC}"
fi

# Periksa apakah server sudah berjalan
if [ -f "server.pid" ]; then
  PID=$(cat server.pid 2>/dev/null)
  if [ ! -z "$PID" ] && ps -p $PID > /dev/null; then
    echo -e "${RED}Server sudah berjalan dengan PID: $PID${NC}"
    exit 1
  else
    echo -e "${YELLOW}Menemukan PID file tidak valid. Menghapus...${NC}"
    rm -f server.pid
  fi
fi

# Pastikan file server ada
if [ ! -f "server-node12.cjs" ]; then
  echo -e "${RED}Error: File server-node12.cjs tidak ditemukan${NC}"
  exit 1
fi

echo -e "${GREEN}Menjalankan server...${NC}"
echo -e "Log akan disimpan di server.log"
echo -e "PID akan disimpan di server.pid"
echo -e "Gunakan ./manage-server.sh untuk mengelola server"

# Mulai server
node server-node12.cjs > server.log 2>&1 &
PID=$!
echo $PID > server.pid

echo -e "${GREEN}Server berhasil dimulai dengan PID: $PID${NC}"
echo -e "Akses di ${BLUE}http://localhost:5000${NC} atau ${BLUE}http://SERVER_IP:5000${NC}"
echo -e "Gunakan ${YELLOW}./manage-server.sh status${NC} untuk memeriksa status server"
echo -e "Gunakan ${YELLOW}./manage-server.sh stop${NC} untuk menghentikan server"
echo -e "Gunakan ${YELLOW}./manage-server.sh logs${NC} untuk melihat log server"