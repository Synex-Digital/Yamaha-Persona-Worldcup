const fs = require('fs');
const path = require('path');

// Load environment files sequentially. Local overrides (.env.local) take precedence over production defaults (.env.production).
const envFiles = ['.env', '.env.production', '.env.local'];
for (const file of envFiles) {
  const envPath = path.resolve(__dirname, '..', file);
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath, override: true });
    console.log(`Loaded environment from ${file}`);
  }
}

const mysql = require('mysql2/promise');

async function addColumnIfMissing(pool, tableName, columnName, sqlDefinition) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );

  if (!rows[0].count) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${sqlDefinition}`);
    console.log(`Added ${tableName}.${columnName}`);
  }
}

async function ensureInnoDB(pool, tableName) {
  try {
    await pool.query(`ALTER TABLE ${tableName} ENGINE=InnoDB`);
    console.log(`Ensured ${tableName} uses InnoDB`);
  } catch (error) {
    console.warn(`Could not enforce InnoDB for ${tableName}: ${error.message}`);
  }
}

async function runMigration() {
  console.log('Connecting to database...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true // Important to allow multiple SQL statements if needed
  });

  try {
    const schemaPath = path.join(__dirname, '../src/lib/server/schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Keep the schema aligned with the configured target database.
    const targetDb = process.env.DB_NAME || 'imagegro_yamaha';
    const normalizedSchema = schemaSql
      .replace(/CREATE DATABASE IF NOT EXISTS\s+[`"]?[a-zA-Z0-9_]+[`"]?/i, `CREATE DATABASE IF NOT EXISTS ${targetDb}`)
      .replace(/USE\s+[`"]?[a-zA-Z0-9_]+[`"]?/i, `USE ${targetDb}`);

    // Split the SQL file by semicolons to execute statements sequentially
    // We ignore empty statements to prevent MySQL errors
    const statements = normalizedSchema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    console.log(`Found ${statements.length} SQL statements to execute.`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await pool.query(stmt);
        console.log(`[Success] Statement ${i + 1}/${statements.length}`);

        const createMatch = stmt.match(/^CREATE TABLE IF NOT EXISTS\s+([a-zA-Z0-9_]+)/i);
        if (createMatch) {
          await ensureInnoDB(pool, createMatch[1]);
        }
      } catch (err) {
        console.error(`[Error] Failed at Statement ${i + 1}/${statements.length}`);
        console.error(`Query: ${stmt.substring(0, 100)}...`);
        console.error(err.message);
        throw err; // Stop migration on first error
      }
    }

    await addColumnIfMissing(pool, 'option_bike_mappings', 'weight_percent', 'weight_percent INT NOT NULL DEFAULT 0');
    await addColumnIfMissing(pool, 'option_bike_mappings', 'priority_order', 'priority_order INT NOT NULL DEFAULT 0');
    await addColumnIfMissing(pool, 'option_bike_mappings', 'is_active', 'is_active BOOLEAN DEFAULT TRUE');
    await addColumnIfMissing(pool, 'quiz_questions', 'question_text_bn', 'question_text_bn TEXT NULL');
    await addColumnIfMissing(pool, 'quiz_options', 'option_text_bn', 'option_text_bn VARCHAR(255) NULL');
    await addColumnIfMissing(pool, 'quiz_options', 'option_desc_bn', 'option_desc_bn TEXT NULL');
    await addColumnIfMissing(pool, 'quiz_options', 'is_active', 'is_active BOOLEAN NOT NULL DEFAULT TRUE');
    await addColumnIfMissing(pool, 'bikes', 'description_bn', 'description_bn TEXT NULL');
    await addColumnIfMissing(pool, 'generations', 'behavior_option_id', 'behavior_option_id INT NULL');
    await addColumnIfMissing(pool, 'generations', 'destination_option_id', 'destination_option_id INT NULL');
    await addColumnIfMissing(pool, 'generations', 'aspiration_option_id', 'aspiration_option_id INT NULL');
    await addColumnIfMissing(pool, 'generations', 'final_prompt', 'final_prompt LONGTEXT NULL');
    await addColumnIfMissing(pool, 'generations', 'resolved_bike_color', 'resolved_bike_color VARCHAR(255) NULL');
    await addColumnIfMissing(pool, 'generations', 'selection_meta', 'selection_meta JSON NULL');
    await addColumnIfMissing(pool, 'generations', 'performance_meta', 'performance_meta JSON NULL');

    // Backfill legacy bike mappings with evenly distributed weights.
    const [options] = await pool.query(
      'SELECT DISTINCT option_id FROM option_bike_mappings WHERE weight_percent = 0 OR priority_order = 0'
    );

    for (const row of options) {
      const [mappings] = await pool.query(
        `SELECT id
         FROM option_bike_mappings
         WHERE option_id = ?
         ORDER BY priority_order ASC, id ASC`,
        [row.option_id]
      );

      if (!mappings.length) continue;

      const baseWeight = Math.floor(100 / mappings.length);
      let remainder = 100 - baseWeight * mappings.length;

      for (let index = 0; index < mappings.length; index++) {
        const weight = baseWeight + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        await pool.query(
          `UPDATE option_bike_mappings
           SET weight_percent = ?, priority_order = ?, is_active = COALESCE(is_active, TRUE)
           WHERE id = ?`,
          [weight, index + 1, mappings[index].id]
        );
      }
    }

    await pool.query('DROP TABLE IF EXISTS prompts');
    console.log('Removed legacy prompts table if it existed');

    console.log('✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();
