#!/bin/bash
# Script untuk konversi server.js dari ES Module ke CommonJS format
# Berguna untuk lingkungan Node.js versi lama (v12) yang tidak mendukung ES modules dengan baik

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${YELLOW}===== Konversi ES Module ke CommonJS =====${NC}"
echo "Script ini akan membantu mengatasi masalah 'require is not defined' error di Node.js versi lama"

# Memeriksa apakah package.json menggunakan type:module
if grep -q '"type": "module"' package.json; then
  echo -e "${YELLOW}package.json menggunakan 'type:module', yang bisa menyebabkan konflik di Node.js v12${NC}"
  echo -e "Solusi terbaik adalah menggunakan file dengan ekstensi .cjs untuk memaksa mode CommonJS"
fi

echo -e "\n${BLUE}Untuk menjalankan server yang kompatibel dengan Node.js v12:${NC}"
echo -e "1. Gunakan ${GREEN}./run-node12.sh${NC} (direkomendasikan)"
echo -e "2. Atau jalankan langsung dengan ${GREEN}node server-node12.cjs${NC}"

echo -e "\n${BLUE}Untuk memastikan server berjalan dengan benar:${NC}"
echo -e "- Setelah server berjalan, buka di browser: ${GREEN}http://SERVER_IP:5000/api/health${NC}"
echo -e "- Anda seharusnya melihat pesan sukses dalam format JSON"

echo -e "\n${BLUE}Jika mengalami masalah:${NC}"
echo -e "1. Hentikan server jika masih berjalan: ${GREEN}kill \$(cat server.pid)${NC}"
echo -e "2. Hapus node_modules jika ada masalah dengan dependensi: ${GREEN}./clean-dependencies.sh${NC}"
echo -e "3. Perhatikan jika ada error di log server: ${GREEN}cat server.log${NC}"

echo -e "\n${YELLOW}Jika terjadi error 'require is not defined', pastikan:${NC}"
echo -e "1. Menggunakan file .cjs (CommonJS) bukan .js atau .mjs"
echo -e "2. Jangan menggunakan import/export syntax ES6, gunakan module.exports dan require()"
echo -e "3. Node.js v12 memiliki dukungan ES Module yang terbatas"

echo -e "\n${GREEN}Server yang kompatibel Node.js v12 sudah tersedia di repositori ini.${NC}"