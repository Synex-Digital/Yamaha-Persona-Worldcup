require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function test() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'imagegro_yamaha',
    });

    console.log('Connecting...');
    const [rows] = await pool.query('SELECT id FROM otps LIMIT 1');
    console.log('Connected and queried otps successfully. Found:', rows);
    process.exit(0);
  } catch (err) {
    console.error('Database Error:', err.message);
    process.exit(1);
  }
}

test();
