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

async function createAdminUser() {
  // Connect to the database
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Check if admin user already exists
    const checkResult = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      ["anam"]
    );
    
    const hashedPassword = await hashPassword("Anam490468");
    
    if (DEBUG) {
      console.log("Generated hash:", hashedPassword);
    }
    
    if (checkResult.rows.length > 0) {
      console.log("Admin user 'anam' already exists, updating password...");
      
      // Update admin user's password
      await pool.query(
        `UPDATE users SET password = $1 WHERE username = $2`,
        [hashedPassword, "anam"]
      );
      
      console.log("Admin user password updated successfully!");
    } else {
      // Create the admin user
      await pool.query(
        `INSERT INTO users (username, password, email, "fullName", "userType") 
         VALUES ($1, $2, $3, $4, $5)`,
        ["anam", hashedPassword, "admin@example.com", "Admin User", "admin"]
      );
      
      console.log("Admin user created successfully!");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  } finally {
    await pool.end();
  }
}

createAdminUser().catch(console.error);