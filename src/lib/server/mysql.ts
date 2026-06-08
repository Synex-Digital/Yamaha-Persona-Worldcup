import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'imagegro_yamaha',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '50'),
  queueLimit: 0,
  multipleStatements: true // Needed for running schema.sql
});

/**
 * Helper to query the database
 */
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const [results] = await pool.execute(sql, params);
  return results as T;
}

/**
 * Initialize the database schema
 * This should ideally be run via a dedicated migration script or on startup
 */
export async function initializeDatabase() {
  try {
    const schemaPath = path.join(process.cwd(), 'src/lib/server/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Running database initialization...');
    await pool.query(schema);
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

export default pool;
