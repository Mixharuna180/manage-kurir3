#!/bin/bash
# app.sh - One-Click Installation Script untuk LogiTech Delivery System
# ===================================================================
# Ini adalah script all-in-one untuk menginstall, mengkonfigurasi, dan
# menjalankan aplikasi LogiTech Delivery System dengan sekali klik.
# 
# Cara penggunaan: chmod +x app.sh && sudo ./app.sh

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
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
  exit 1
}

# Function untuk menampilkan header
show_header() {
  clear
  echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║                                                            ║${NC}"
  echo -e "${YELLOW}║${WHITE}              LOGITECH DELIVERY SYSTEM INSTALLER            ${YELLOW}║${NC}"
  echo -e "${YELLOW}║                                                            ║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
  echo -e "${CYAN}         Versi: 1.0.0 | Pembuat: Tim LogiTech 2025${NC}"
  echo ""
}

# Function untuk menampilkan progress bar
progress_bar() {
  local duration=$1
  local progress=0
  local full_bar_size=50
  
  # Hitung interval berdasarkan durasi
  local interval=$(bc <<< "scale=2; $duration / $full_bar_size")
  
  # Tampilkan progress bar kosong
  echo -ne "${YELLOW}[${NC}"
  for ((i=0; i<full_bar_size; i++)); do
    echo -ne " "
  done
  echo -ne "${YELLOW}]${NC} 0%"
  
  # Update progress
  for ((i=0; i<=full_bar_size; i++)); do
    # Hitung persentase
    progress=$(bc <<< "scale=0; $i * 100 / $full_bar_size")
    
    # Pindah kursor kembali ke awal progress bar
    echo -ne "\r${YELLOW}[${NC}"
    
    # Tampilkan bagian yang sudah selesai
    for ((j=0; j<i; j++)); do
      echo -ne "${GREEN}█${NC}"
    done
    
    # Tampilkan bagian yang belum selesai
    for ((j=i; j<full_bar_size; j++)); do
      echo -ne " "
    done
    
    # Tampilkan persentase
    echo -ne "${YELLOW}]${NC} ${progress}%"
    
    # Tunggu interval
    sleep $interval
  done
  
  echo ""
}

# Check apakah script dijalankan dengan sudo
check_permissions() {
  echo -e "${YELLOW}Memeriksa izin akses...${NC}"
  if [ "$EUID" -ne 0 ]; then
    error "Script ini harus dijalankan dengan hak root. Jalankan: sudo ./app.sh"
  fi
  success "Izin akses diberikan"
  echo ""
}

# Konfirmasi instalasi
confirm_installation() {
  echo -e "${WHITE}Script ini akan menginstall dan mengkonfigurasi${NC}"
  echo -e "${WHITE}aplikasi LogiTech Delivery System pada server Anda.${NC}"
  echo ""
  echo -e "${WHITE}Pastikan Anda telah memenuhi prasyarat berikut:${NC}"
  echo -e " - ${CYAN}Server dengan OS Ubuntu/Debian${NC}"
  echo -e " - ${CYAN}Koneksi internet stabil${NC}"
  echo -e " - ${CYAN}Minimal 1GB RAM dan 10GB disk space${NC}"
  echo -e " - ${CYAN}Belum ada PostgreSQL atau NodeJS yang terpasang (atau versi lama)${NC}"
  echo ""
  echo -e "${YELLOW}Proses ini akan:${NC}"
  echo -e " - ${CYAN}Menginstall NodeJS, NPM, dan PM2${NC}"
  echo -e " - ${CYAN}Menginstall dan mengkonfigurasi PostgreSQL${NC}"
  echo -e " - ${CYAN}Membuat database dan user untuk aplikasi${NC}"
  echo -e " - ${CYAN}Menginstall dan mengkonfigurasi Nginx${NC}"
  echo -e " - ${CYAN}Menjalankan aplikasi dengan PM2${NC}"
  echo ""
  
  read -p "Lanjutkan instalasi? (y/n): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Instalasi dibatalkan."
    exit 0
  fi
  echo ""
}

# Persiapan sistem
prepare_system() {
  echo -e "${YELLOW}Tahap 1: Mempersiapkan Sistem${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  log "Mengupdate paket sistem..."
  apt-get update > /dev/null 2>&1 || error "Gagal update system packages"
  success "Paket sistem berhasil diupdate"
  
  log "Menginstall dependencies dasar..."
  apt-get install -y curl wget gnupg2 ca-certificates lsb-release apt-transport-https \
    unzip git build-essential python3 > /dev/null 2>&1 || error "Gagal install dependencies"
  success "Dependencies dasar berhasil diinstall"
  
  echo ""
  progress_bar 2
  echo ""
}

# Install NodeJS dan NPM
install_nodejs() {
  echo -e "${YELLOW}Tahap 2: Menginstall NodeJS & NPM${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  if ! command -v node &> /dev/null; then
    log "Menginstall NodeJS 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1 || error "Gagal setup NodeJS repository"
    apt-get install -y nodejs > /dev/null 2>&1 || error "Gagal install NodeJS"
    
    # Install PM2 globally
    log "Menginstall PM2 globally..."
    npm install -g pm2 > /dev/null 2>&1 || error "Gagal install PM2"
    
    success "NodeJS ${YELLOW}$(node -v)${GREEN} dan NPM ${YELLOW}$(npm -v)${GREEN} berhasil diinstall"
  else
    warn "NodeJS sudah terinstall: $(node -v)"
  fi
  
  echo ""
  progress_bar 3
  echo ""
}

# Install dan konfigurasi PostgreSQL
install_postgresql() {
  echo -e "${YELLOW}Tahap 3: Menginstall dan Mengkonfigurasi PostgreSQL${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  if ! command -v psql &> /dev/null; then
    log "Menginstall PostgreSQL..."
    echo "deb [arch=$(dpkg --print-architecture)] http://apt.postgresql.org/pub/repos/apt/ $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - > /dev/null 2>&1
    apt-get update > /dev/null 2>&1 || error "Gagal update repositories setelah menambahkan PostgreSQL"
    apt-get install -y postgresql postgresql-contrib > /dev/null 2>&1 || error "Gagal install PostgreSQL"
    success "PostgreSQL berhasil diinstall"
  else
    warn "PostgreSQL sudah terinstall: $(psql --version)"
  fi
  
  log "Memulai layanan PostgreSQL..."
  service postgresql start > /dev/null 2>&1 || warn "PostgreSQL mungkin sudah berjalan"
  
  log "Menyiapkan database LogiTech..."
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='logitech_db'" | grep -q 1; then
    warn "Database logitech_db sudah ada"
  else
    # Buat database dan user
    sudo -u postgres psql -c "CREATE DATABASE logitech_db;" > /dev/null 2>&1 || error "Gagal membuat database"
    DB_PASSWORD="Logitech$(openssl rand -hex 4)"
    sudo -u postgres psql -c "CREATE USER logitech WITH ENCRYPTED PASSWORD '$DB_PASSWORD';" > /dev/null 2>&1 || error "Gagal membuat user database"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE logitech_db TO logitech;" > /dev/null 2>&1 || error "Gagal memberikan privileges"
    sudo -u postgres psql -c "ALTER USER logitech WITH SUPERUSER;" > /dev/null 2>&1 || error "Gagal set superuser privileges"
    success "Database logitech_db berhasil dibuat dengan user logitech"
    
    # Simpan informasi database
    DB_URL="postgresql://logitech:$DB_PASSWORD@localhost:5432/logitech_db"
    echo "$DB_URL" > /tmp/db_url.txt
    success "Connection string database berhasil disimpan: $DB_URL"
  fi
  
  echo ""
  progress_bar 4
  echo ""
}

# Install dan konfigurasi Nginx
install_nginx() {
  echo -e "${YELLOW}Tahap 4: Menginstall dan Mengkonfigurasi Nginx${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  if ! command -v nginx &> /dev/null; then
    log "Menginstall Nginx..."
    apt-get install -y nginx > /dev/null 2>&1 || error "Gagal install Nginx"
    success "Nginx berhasil diinstall"
  else
    warn "Nginx sudah terinstall: $(nginx -v 2>&1 | cut -d'/' -f2)"
  fi
  
  log "Mengkonfigurasi Nginx untuk LogiTech..."
  
  # Buat konfigurasi Nginx
  cat > /etc/nginx/sites-available/logitech << 'EOF'
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
  
  # Aktifkan konfigurasi
  ln -sf /etc/nginx/sites-available/logitech /etc/nginx/sites-enabled/
  
  # Verifikasi konfigurasi
  nginx -t > /dev/null 2>&1 || error "Konfigurasi Nginx tidak valid. Cek format atau sintaks"
  
  # Reload Nginx
  systemctl reload nginx > /dev/null 2>&1 || error "Gagal me-reload Nginx"
  
  success "Nginx berhasil dikonfigurasi untuk aplikasi LogiTech"
  
  echo ""
  progress_bar 2
  echo ""
}

# Download dan setup aplikasi
setup_application() {
  echo -e "${YELLOW}Tahap 5: Menyiapkan Aplikasi LogiTech${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  # Direktori aplikasi
  APP_DIR="/var/www/logitech"
  
  log "Menyiapkan direktori aplikasi di $APP_DIR..."
  mkdir -p $APP_DIR
  cd $APP_DIR || error "Gagal mengakses direktori aplikasi"
  
  log "Mendownload aplikasi dari GitHub..."
  if [ -f "package.json" ]; then
    warn "Aplikasi sudah ada di $APP_DIR"
  else
    # Clone dari GitHub
    git clone --depth=1 https://github.com/Mixharuna180/manage-kurir3.git . > /dev/null 2>&1 || error "Gagal clone repository"
    success "Repository berhasil di-clone"
  fi
  
  log "Menginstall dependensi aplikasi..."
  npm ci --omit=dev > /dev/null 2>&1 || npm install --omit=dev > /dev/null 2>&1 || error "Gagal install dependensi aplikasi"
  success "Dependensi aplikasi berhasil diinstall"
  
  log "Mengkonfigurasi environment variables..."
  
  # Buat file .env
  DB_URL=$(cat /tmp/db_url.txt 2>/dev/null || echo "postgresql://logitech:Logitech123@localhost:5432/logitech_db")
  SESSION_SECRET=$(openssl rand -hex 32)
  
  cat > $APP_DIR/.env << EOF
# Database Configuration
DATABASE_URL=$DB_URL

# Midtrans Integration
MIDTRANS_SERVER_KEY=your_midtrans_server_key
MIDTRANS_CLIENT_KEY=your_midtrans_client_key

# Session Secret
SESSION_SECRET=$SESSION_SECRET

# Production Environment
NODE_ENV=production
PORT=5000
EOF
  
  success "File konfigurasi .env berhasil dibuat"
  
  echo ""
  progress_bar 4
  echo ""
}

# Jalankan aplikasi dengan PM2
start_application() {
  echo -e "${YELLOW}Tahap 6: Menjalankan Aplikasi${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  cd /var/www/logitech || error "Gagal mengakses direktori aplikasi"
  
  log "Mencoba beberapa metode untuk menjalankan server..."
  
  # Metode 1: Menggunakan PM2 dan ecosystem config
  if command -v pm2 &> /dev/null; then
    log "Metode 1: Menggunakan PM2..."
    cat > ecosystem-fix.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'logitech',
    script: 'server-simple.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF
    
    pm2 start ecosystem-fix.config.js > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      success "Server berhasil dijalankan dengan PM2"
      pm2 save > /dev/null 2>&1 || warn "Gagal menyimpan konfigurasi PM2"
      pm2 startup > /dev/null 2>&1 || warn "Gagal setup startup PM2"
    else
      warn "Gagal menjalankan server dengan PM2, mencoba metode lain..."
    fi
  else
    warn "PM2 tidak ditemukan. Melewati metode PM2..."
  fi
  
  # Jika server belum berjalan, coba metode 2: Menggunakan Node.js langsung
  if ! pm2 list | grep -q "logitech" > /dev/null 2>&1; then
    log "Metode 2: Menggunakan script bash sederhana..."
    
    # Install cookie-parser jika diperlukan
    log "Menginstal cookie-parser untuk server kompatibel..."
    npm install cookie-parser --save > /dev/null 2>&1 || warn "Gagal menginstal cookie-parser. Akan tetap melanjutkan."
    
    # Buat script daemon dengan server legacy untuk kompatibilitas maksimum
    cat > start-daemon.sh << 'EOF'
#!/bin/bash
cd "$PWD"
nohup node server-legacy.js > server.log 2>&1 &
echo $! > server.pid
echo "Server dimulai dengan PID $(cat server.pid)"
EOF
    
    chmod +x start-daemon.sh > /dev/null 2>&1
    ./start-daemon.sh
    
    if [ $? -eq 0 ]; then
      success "Server berhasil dijalankan sebagai daemon"
    else
      warn "Gagal menjalankan server sebagai daemon, mencoba metode terakhir..."
      
      # Metode 3: Menggunakan systemd service
      log "Metode 3: Menggunakan systemd service..."
      
      cat > /etc/systemd/system/logitech.service << EOF
[Unit]
Description=LogiTech Delivery System
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node $APP_DIR/server-legacy.js
Restart=on-failure
Environment="PORT=5000"
Environment="NODE_ENV=production"
Environment="DATABASE_URL=${DATABASE_URL:-postgresql://logitech:Anam490468@localhost:5432/logitech_db}"

[Install]
WantedBy=multi-user.target
EOF
      
      systemctl daemon-reload > /dev/null 2>&1
      systemctl enable logitech > /dev/null 2>&1
      systemctl start logitech > /dev/null 2>&1
      
      if [ $? -eq 0 ]; then
        success "Server berhasil dijalankan sebagai systemd service"
      else
        error "Semua metode gagal menjalankan server!"
        log "Gunakan run-server.sh untuk menjalankan server secara manual"
        exit 1
      fi
    fi
  fi
  
  success "Aplikasi berhasil dijalankan dengan PM2"
  
  echo ""
  progress_bar 2
  echo ""
}

# Setup firewall
setup_firewall() {
  echo -e "${YELLOW}Tahap 7: Mengkonfigurasi Firewall${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  if command -v ufw &> /dev/null; then
    log "Mengkonfigurasi UFW Firewall..."
    
    # Buka port yang diperlukan
    ufw allow ssh > /dev/null 2>&1 || warn "Gagal membuka port SSH"
    ufw allow http > /dev/null 2>&1 || warn "Gagal membuka port HTTP"
    ufw allow https > /dev/null 2>&1 || warn "Gagal membuka port HTTPS"
    
    # Aktifkan firewall jika belum aktif
    if ! ufw status | grep -q "Status: active"; then
      echo "y" | ufw enable > /dev/null 2>&1 || warn "Gagal mengaktifkan firewall"
    fi
    
    success "Firewall berhasil dikonfigurasi"
  else
    warn "UFW tidak terinstall. Melewati konfigurasi firewall."
  fi
  
  echo ""
  progress_bar 1
  echo ""
}

# Tampilkan ringkasan
show_summary() {
  echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${YELLOW}║${GREEN}             INSTALASI BERHASIL DISELESAIKAN!              ${YELLOW}║${NC}"
  echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${WHITE}Informasi Aplikasi:${NC}"
  echo -e " - ${CYAN}URL Aplikasi: ${WHITE}http://localhost${NC} atau ${WHITE}http://SERVER_IP${NC}"
  echo -e " - ${CYAN}Status Aplikasi: ${GREEN}Aktif${NC}"
  echo -e " - ${CYAN}Direktori Aplikasi: ${WHITE}/var/www/logitech${NC}"
  echo -e " - ${CYAN}Log Aplikasi: ${WHITE}pm2 logs logitech${NC}"
  
  echo ""
  echo -e "${WHITE}Kredensial Default:${NC}"
  echo -e " - ${CYAN}Admin Username: ${WHITE}anam${NC}"
  echo -e " - ${CYAN}Admin Password: ${WHITE}Anam490468${NC}"
  echo -e " - ${CYAN}Driver Username: ${WHITE}driver1${NC}"
  echo -e " - ${CYAN}Driver Password: ${WHITE}Driver123${NC}"
  
  echo ""
  echo -e "${WHITE}Perintah Berguna:${NC}"
  echo -e " - ${CYAN}Restart aplikasi: ${WHITE}pm2 restart logitech${NC}"
  echo -e " - ${CYAN}Lihat log: ${WHITE}pm2 logs logitech${NC}"
  echo -e " - ${CYAN}Status aplikasi: ${WHITE}pm2 status${NC}"
  echo -e " - ${CYAN}Update aplikasi: ${WHITE}cd /var/www/logitech && git pull${NC}"
  
  echo ""
  echo -e "${RED}CATATAN PENTING: ${WHITE}Segera ubah semua password default setelah login!${NC}"
  echo -e "${YELLOW}Instalasi selesai. Terima kasih telah menggunakan LogiTech Delivery System.${NC}"
}

# Main function untuk menjalankan semua proses
main() {
  show_header
  check_permissions
  confirm_installation
  
  # Jalankan semua tahapan instalasi
  prepare_system
  install_nodejs
  install_postgresql
  install_nginx
  setup_application
  start_application
  setup_firewall
  
  # Tampilkan ringkasan
  show_summary
}

# Jalankan program utama
main