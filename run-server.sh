#!/bin/bash
# run-server.sh - Script sederhana untuk menjalankan server

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}----------------------------------------${NC}"
echo -e "${BLUE}LogiTech Delivery System - Manual Startup${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

# Check apakah Node.js terpasang
if ! command -v node &> /dev/null; then
  echo -e "${RED}Node.js tidak ditemukan! Harap install Node.js terlebih dahulu.${NC}"
  exit 1
fi

# Check apakah file server ada
if [ -f "server-compatible.js" ]; then
  echo -e "${GREEN}Menggunakan server-compatible.js (Direkomendasikan)${NC}"
  SERVER_FILE="server-compatible.js"
  
  # Check cookie-parser
  if ! node -e "try{require('cookie-parser');console.log('ok')} catch(e){process.exit(1)}" &> /dev/null; then
    echo -e "${YELLOW}Menginstall cookie-parser...${NC}"
    npm install cookie-parser --save
  fi
elif [ -f "server-simple.js" ]; then
  echo -e "${YELLOW}Menggunakan server-simple.js${NC}"
  SERVER_FILE="server-simple.js"
else
  echo -e "${YELLOW}server-simple.js tidak ditemukan, mencoba download dari GitHub...${NC}"
  curl -s https://raw.githubusercontent.com/Mixharuna180/manage-kurir3/main/server-simple.js > server-simple.js
  if [ $? -ne 0 ]; then
    echo -e "${RED}Gagal mendownload server-simple.js${NC}"
    exit 1
  else
    echo -e "${GREEN}Berhasil mendownload server-simple.js${NC}"
    SERVER_FILE="server-simple.js"
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

echo -e "${GREEN}Memulai server...${NC}"
echo -e "${YELLOW}Server akan berjalan di port 5000${NC}"
echo -e "${YELLOW}Silakan akses http://localhost:5000 atau http://SERVER_IP:5000${NC}"
echo -e "${BLUE}----------------------------------------${NC}"

# Mencoba menjalankan server
node server-simple.js