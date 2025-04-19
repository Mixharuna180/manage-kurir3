#!/bin/bash
# run-legacy-server.sh - Script untuk menjalankan server yang kompatibel dengan Node.js lama

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}LogiTech Legacy Server - Manual Startup${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

# Check apakah Node.js terpasang
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js tidak ditemukan! Harap install Node.js terlebih dahulu.${NC}"
  exit 1
fi

# Periksa apakah server sudah berjalan
if [ -f "server.pid" ]; then
  PID=$(cat server.pid)
  if ps -p $PID > /dev/null; then
    echo -e "${YELLOW}Server sudah berjalan dengan PID: $PID${NC}"
    echo -e "${YELLOW}Gunakan ./manage-server.sh stop untuk menghentikan server${NC}"
    exit 0
  else
    echo -e "${YELLOW}PID lama tidak valid, menghapus file PID...${NC}"
    rm server.pid
  fi
fi

# Check apakah express dan pg sudah diinstall
if ! node -e "try{require('express');require('pg');console.log('ok')} catch(e){process.exit(1)}" &> /dev/null; then
  echo -e "${YELLOW}Dependensi tidak lengkap, mencoba install express dan pg...${NC}"
  npm install express pg --no-save
  if [ $? -ne 0 ]; then
    echo -e "${RED}Gagal menginstall dependensi${NC}"
    exit 1
  else
    echo -e "${GREEN}Berhasil menginstall dependensi${NC}"
  fi
fi

# Set DATABASE_URL jika belum ada
if [ -z "$DATABASE_URL" ]; then
  echo -e "${YELLOW}DATABASE_URL tidak diatur, gunakan nilai default${NC}"
  export DATABASE_URL="postgresql://logitech:Anam490468@localhost:5432/logitech_db"
fi

echo -e "${GREEN}Memulai server legacy...${NC}"
echo -e "${YELLOW}Server akan berjalan di port 5000${NC}"
echo -e "${YELLOW}Silakan akses http://localhost:5000 atau http://SERVER_IP:5000${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

# Jalankan server sebagai daemon
nohup node server-legacy.js > server.log 2>&1 &
PID=$!
echo $PID > server.pid

sleep 2

if ps -p $PID > /dev/null; then
  echo -e "${GREEN}Server berhasil dimulai dengan PID: $PID${NC}"
  echo -e "${YELLOW}Server logs: ./server.log${NC}"
  echo -e "${YELLOW}PID File: ./server.pid${NC}"
else
  echo -e "${RED}Gagal memulai server!${NC}"
  if [ -f "server.log" ]; then
    echo -e "${YELLOW}Log server:${NC}"
    tail -n 10 server.log
  fi
  exit 1
fi

echo -e "${GREEN}Berhasil! Server berjalan di latar belakang.${NC}"
echo -e "${YELLOW}Untuk melihat log, gunakan: tail -f server.log${NC}"
echo -e "${YELLOW}Untuk menghentikan server, gunakan: ./manage-server.sh stop${NC}"

exit 0