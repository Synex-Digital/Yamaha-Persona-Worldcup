require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function applyAlter() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yamaha_ai'
  });

  try {
    console.log('Altering users table...');
    await connection.query("ALTER TABLE users MODIFY COLUMN dob VARCHAR(50);");
    console.log('✅ Alter table completed successfully!');
  } catch (error) {
    console.error('❌ Alter table failed:', error.message);
  } finally {
    await connection.end();
  }
}

applyAlter();
