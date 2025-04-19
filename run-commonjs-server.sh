#!/bin/bash
# Script untuk menjalankan server CommonJS

# Warna untuk logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Memeriksa apakah server sudah berjalan
if [ -f "server.pid" ]; then
  PID=$(cat server.pid)
  if ps -p $PID > /dev/null; then
    echo -e "${YELLOW}Server sudah berjalan dengan PID $PID${NC}"
    echo -e "Gunakan ${BLUE}./manage-server.sh restart${NC} jika ingin merestart server"
    exit 1
  else
    echo -e "${YELLOW}Menemukan file PID tidak valid, menghapusnya...${NC}"
    rm -f server.pid
  fi
fi

# Memeriksa variabel lingkungan DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}DATABASE_URL tidak diatur, gunakan nilai default${NC}"
fi

# Mulai server
echo -e "${BLUE}Memulai server CommonJS...${NC}"
node server-commonjs.js > server.log 2>&1 &
PID=$!
echo $PID > server.pid

echo "Server akan berjalan di port 5000"
echo "Silakan akses http://localhost:5000 atau http://SERVER_IP:5000"
echo "----------------------------------------"

# Tunggu beberapa saat dan periksa apakah server masih berjalan
sleep 3
if ps -p $PID > /dev/null; then
  echo -e "${GREEN}Server berhasil dijalankan dengan PID $PID${NC}"
  
  # Tampilkan beberapa baris log terakhir
  echo -e "${BLUE}Log server:${NC}"
  tail -n 5 server.log
  
  echo -e "\n${GREEN}Server berjalan di background. Gunakan berikut untuk mengelola:${NC}"
  echo -e "- Melihat log: ${BLUE}tail -f server.log${NC}"
  echo -e "- Menghentikan server: ${BLUE}./manage-server.sh stop${NC}"
  echo -e "- Status server: ${BLUE}./check-server.sh${NC}"
else
  echo -e "${RED}Gagal memulai server!${NC}"
  echo -e "${YELLOW}Log server:${NC}"
  cat server.log
  rm -f server.pid
  exit 1
fi