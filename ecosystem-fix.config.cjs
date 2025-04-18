// Konfigurasi PM2 untuk server versi sederhana
module.exports = {
  apps: [{
    name: 'logitech',
    script: 'server-simple-fix.js',
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