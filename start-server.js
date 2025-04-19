// start-server.js - Starter script sederhana untuk server Express
const express = require('express');
const pg = require('pg');
const fs = require('fs');
const path = require('path');
const http = require('http');

const app = express();
const port = process.env.PORT || 5000;

console.log('----------------------------------------');
console.log('LogiTech Delivery System - Server Starter');
console.log('----------------------------------------');
console.log('Mencoba memulai server...');

// Siapkan middleware dasar
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist', 'client')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    message: 'Server berjalan dengan baik (Simple Server)'
  });
});

// Fallback route
app.get('*', (req, res) => {
  res.send('LogiTech Delivery System - Server Starter is running');
});

// Mulai server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server starter berjalan di port ${port}`);
  console.log('URL: http://localhost:' + port);
  
  // Menjalankan script utama
  console.log('Mencoba menjalankan server utama...');
  try {
    require('./server-pg.js');
    console.log('Server utama berhasil dimulai!');
  } catch (e) {
    console.error('Gagal menjalankan server utama:', e);
    console.log('Menggunakan server alternatif...');
    
    try {
      require('./server-simple-fix.js');
      console.log('Server alternatif berhasil dimulai!');
    } catch (e2) {
      console.error('Gagal menjalankan server alternatif:', e2);
      console.log('Server starter akan tetap berjalan sebagai fallback');
    }
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  console.log('Server akan tetap berjalan meskipun terjadi error');
});