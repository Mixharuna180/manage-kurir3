import { db, pool } from '../server/db.js';
import { users } from '../shared/schema.js';
import crypto from 'crypto';

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

async function createDriverUsers() {
  try {
    console.log('Membuat user driver...');
    
    // Driver untuk berbagai area di Palembang
    const drivers = [
      {
        username: 'driver1',
        email: 'driver1@logitech.com',
        fullName: 'Budi Santoso',
        password: 'Driver123',
        userType: 'driver',
        serviceArea: 'Ilir Timur I',
        phoneNumber: '081234567890',
        address: 'Jl. Merdeka No. 10',
        city: 'Palembang',
        postalCode: '30111'
      },
      {
        username: 'driver2',
        email: 'driver2@logitech.com',
        fullName: 'Ahmad Dahlan',
        password: 'Driver123',
        userType: 'driver',
        serviceArea: 'Ilir Timur II',
        phoneNumber: '081234567891',
        address: 'Jl. Veteran No. 15',
        city: 'Palembang',
        postalCode: '30112'
      },
      {
        username: 'driver3',
        email: 'driver3@logitech.com',
        fullName: 'Dewi Kartika',
        password: 'Driver123',
        userType: 'driver',
        serviceArea: 'Ilir Barat I',
        phoneNumber: '081234567892',
        address: 'Jl. Diponegoro No. 20',
        city: 'Palembang',
        postalCode: '30113'
      },
      {
        username: 'driver4',
        email: 'driver4@logitech.com',
        fullName: 'Rini Susanti',
        password: 'Driver123',
        userType: 'driver',
        serviceArea: 'Ilir Barat II',
        phoneNumber: '081234567893',
        address: 'Jl. Sudirman No. 25',
        city: 'Palembang',
        postalCode: '30114'
      },
      {
        username: 'driver5',
        email: 'driver5@logitech.com',
        fullName: 'Joko Widodo',
        password: 'Driver123',
        userType: 'driver',
        serviceArea: 'Jakabaring',
        phoneNumber: '081234567894',
        address: 'Jl. Jakabaring No. Sei Jeruju No. 30',
        city: 'Palembang',
        postalCode: '30115'
      }
    ];

    // Memeriksa apakah drivers sudah ada
    const existingDrivers = await db.select().from(users).where('userType', '=', 'driver');
    
    if (existingDrivers.length > 0) {
      console.log('Driver sudah ada di database:');
      existingDrivers.forEach(driver => {
        console.log(`- ${driver.fullName} (${driver.username}): Area ${driver.serviceArea || 'Tidak ditentukan'}`);
      });
      return;
    }

    // Menambahkan drivers ke database
    for (const driver of drivers) {
      const hashedPassword = await hashPassword(driver.password);
      await db.insert(users).values({
        ...driver,
        password: hashedPassword,
        createdAt: new Date()
      });
      console.log(`Driver ${driver.fullName} (${driver.username}) berhasil ditambahkan`);
    }
    
    console.log('Semua driver berhasil ditambahkan!');
  } catch (error) {
    console.error('Error saat membuat user driver:', error);
  } finally {
    await pool.end();
  }
}

createDriverUsers();