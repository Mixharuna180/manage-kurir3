import { Pool, neonConfig } from '@neondatabase/serverless';
import crypto from 'crypto';
import { promisify } from 'util';
import ws from 'ws';

// Configure WebSocket
neonConfig.webSocketConstructor = ws;

// For debugging
const DEBUG = true;

// Hash password
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return crypto.timingSafeEqual(hashedBuf, suppliedBuf);
}

async function debugAuth() {
  // Connect to the database
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get admin user
    const result = await pool.query(
      "SELECT username, password FROM users WHERE username = $1",
      ["anam"]
    );
    
    if (result.rows.length === 0) {
      console.log("Admin user 'anam' not found");
      return;
    }
    
    const user = result.rows[0];
    console.log("User found:", user.username);
    console.log("Stored password hash:", user.password);
    
    // Test password
    const password = "Anam490468";
    const isMatch = await comparePasswords(password, user.password);
    console.log(`Password "${password}" matches:`, isMatch);
    
    // Create a new hash for comparison
    const newHash = await hashPassword(password);
    console.log("New hash for same password:", newHash);
    
    // Test the new hash
    const isMatchWithNewHash = await comparePasswords(password, newHash);
    console.log(`Password "${password}" matches with new hash:`, isMatchWithNewHash);
    
  } catch (error) {
    console.error("Error debugging auth:", error);
  } finally {
    await pool.end();
  }
}

debugAuth().catch(console.error);