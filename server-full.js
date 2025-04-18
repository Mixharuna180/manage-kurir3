// File server-full.js - Full application server dengan PostgreSQL standard
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerRoutes } from './dist/server/routes.js';
import { setupAuth } from './dist/server/auth.js';
import { serveStatic, log } from './dist/server/vite.js';

// Initialize environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 5000;

// Set up express server
const app = express();
app.use(express.json());

// Configure session
const sessionSettings = {
  secret: process.env.SESSION_SECRET || 'default-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
};

if (isProduction) {
  app.set('trust proxy', 1);
}

// Error handler middleware
app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  log(`Error: ${message}`);
  
  res.status(statusCode).json({
    error: message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
});

// Setup auth and API routes
setupAuth(app);
const server = await registerRoutes(app);

// Serve static files in production
if (isProduction) {
  serveStatic(app);
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'client', 'index.html'));
  });
}

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════╗
║          LogiTech Delivery Server          ║
╠════════════════════════════════════════════╣
║ Server running on: http://localhost:${port}   ║
║ Mode: ${isProduction ? 'Production' : 'Development'}                           ║
║ Database: PostgreSQL Standard               ║
╚════════════════════════════════════════════╝
  `);
});