const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

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

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'imagegro_yamaha',
  });

  try {
    console.log('Running migrations...');
    
    // Add hash_id to generations if it doesn't exist
    try {
      await pool.query('ALTER TABLE generations ADD COLUMN hash_id VARCHAR(50) UNIQUE');
      console.log('Added hash_id to generations');
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log('hash_id already exists in generations');
      } else {
        throw e;
      }
    }

    // Create app_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        setting_key VARCHAR(100) PRIMARY KEY,
        setting_value VARCHAR(255) NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Ensured app_settings table exists');

    // Insert default rate limits if they don't exist
    await pool.query(`
      INSERT IGNORE INTO app_settings (setting_key, setting_value) 
      VALUES 
        ('max_hourly_generations', '5'),
        ('max_daily_generations', '10')
    `);
    console.log('Inserted default rate limits');

    // Backfill existing generations with a hash_id
    const [rows] = await pool.query('SELECT id FROM generations WHERE hash_id IS NULL');
    const crypto = require('crypto');
    for (const row of rows) {
      const hash = crypto.randomBytes(16).toString('hex');
      await pool.query('UPDATE generations SET hash_id = ? WHERE id = ?', [hash, row.id]);
    }
    console.log(`Backfilled ${rows.length} existing generations with hash_id`);

    for (const tableName of ['users', 'bikes', 'quiz_questions', 'quiz_options', 'option_bike_mappings', 'generations', 'otps', 'app_settings']) {
      await ensureInnoDB(pool, tableName);
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

    console.log('Migration complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

run();
