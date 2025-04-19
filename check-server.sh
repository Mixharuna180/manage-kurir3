#!/bin/bash
# check-server.sh - Script untuk memeriksa status server

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== LogiTech Server Status Check ===${NC}"
echo ""

# 1. Periksa apakah ada proses Node.js yang berjalan
echo -e "${YELLOW}Memeriksa proses Node.js:${NC}"
ps aux | grep "[n]ode.*server-simple" || echo -e "${RED}Tidak ada proses server-simple.js yang berjalan${NC}"
echo ""

# 2. Periksa apakah ada file server.pid
echo -e "${YELLOW}Memeriksa file server.pid:${NC}"
if [ -f "server.pid" ]; then
  PID=$(cat server.pid)
  echo -e "${GREEN}PID file ditemukan: $PID${NC}"
  
  # Periksa apakah PID masih berjalan
  if ps -p $PID > /dev/null; then
    echo -e "${GREEN}Proses dengan PID $PID masih berjalan${NC}"
  else
    echo -e "${RED}Proses dengan PID $PID tidak berjalan${NC}"
  fi
else
  echo -e "${RED}File server.pid tidak ditemukan${NC}"
fi
echo ""

# 3. Periksa systemd service
echo -e "${YELLOW}Memeriksa systemd service:${NC}"
systemctl status logitech 2>/dev/null || echo -e "${RED}Service logitech tidak ditemukan atau tidak berjalan${NC}"
echo ""

# 4. Periksa koneksi network
echo -e "${YELLOW}Memeriksa port 5000:${NC}"
netstat -tuln | grep ":5000" || echo -e "${RED}Tidak ada proses yang mendengarkan port 5000${NC}"
echo ""

# 5. Periksa nginx
echo -e "${YELLOW}Memeriksa status Nginx:${NC}"
systemctl status nginx 2>/dev/null || echo -e "${RED}Nginx tidak terinstall atau tidak berjalan${NC}"
echo ""

# 6. Mencoba curl ke server
echo -e "${YELLOW}Mencoba mengakses server:${NC}"
curl -s http://localhost:5000/api/health || echo -e "${RED}Tidak dapat mengakses server di http://localhost:5000${NC}"
echo ""

echo -e "${BLUE}=== Selesai ===${NC}"