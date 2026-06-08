require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

async function migrateFinalQuiz() {
  console.log('Connecting to database...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yamaha_ai',
    multipleStatements: true
  });

  try {
    console.log('Dropping old tables...');
    await pool.query("DROP TABLE IF EXISTS rules;");
    await pool.query("DROP TABLE IF EXISTS option_bike_priorities;");
    await pool.query("DROP TABLE IF EXISTS option_bike_mappings;");
    await pool.query("DROP TABLE IF EXISTS quiz_options;");
    await pool.query("DROP TABLE IF EXISTS quiz_questions;");

    console.log('Creating new quiz tables...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question_text TEXT NOT NULL,
          question_type ENUM('behavior', 'destination', 'aspiration') NOT NULL,
          order_index INT DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_options (
          id INT AUTO_INCREMENT PRIMARY KEY,
          question_id INT NOT NULL,
          option_text VARCHAR(255) NOT NULL,
          option_desc TEXT,
          icon_name VARCHAR(100),
          metadata JSON NULL,
          FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS option_bike_mappings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          option_id INT NOT NULL,
          bike_id INT NOT NULL,
          FOREIGN KEY (option_id) REFERENCES quiz_options(id) ON DELETE CASCADE,
          FOREIGN KEY (bike_id) REFERENCES bikes(id) ON DELETE CASCADE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Tables created. Seeding data...');

    // 1. Behavior (Determines Bike)
    const [q1] = await pool.query("INSERT INTO quiz_questions (question_text, question_type, order_index) VALUES (?, ?, ?)", 
      ['How would you describe your riding behavior?', 'behavior', 1]);
    const q1Id = q1.insertId;

    const behaviorOpts = [
      { text: 'Weekend Explorer', desc: 'Long journeys discovering new horizons.', icon: 'Weekend Explorer' },
      { text: 'Daily Commuter', desc: 'Navigating the city with efficiency and style.', icon: 'Daily Commuter' },
      { text: 'Speed Enthusiast', desc: 'Thrilling performance and high-speed control.', icon: 'Speed Enthusiast' }
    ];

    const [bikes] = await pool.query("SELECT id FROM bikes LIMIT 10");

    for (let i = 0; i < behaviorOpts.length; i++) {
      const opt = behaviorOpts[i];
      const [o] = await pool.query("INSERT INTO quiz_options (question_id, option_text, option_desc, icon_name) VALUES (?, ?, ?, ?)",
        [q1Id, opt.text, opt.desc, opt.icon]);
      
      const optId = o.insertId;
      // Map to some bikes (dynamic set)
      if (bikes.length > 0) {
        // Map at least one bike to each behavior
        await pool.query("INSERT INTO option_bike_mappings (option_id, bike_id) VALUES (?, ?)", [optId, bikes[i % bikes.length].id]);
        if (bikes.length > i + 3) {
           await pool.query("INSERT INTO option_bike_mappings (option_id, bike_id) VALUES (?, ?)", [optId, bikes[(i + 3) % bikes.length].id]);
        }
      }
    }

    // 2. Destination (Determines Environment)
    const [q2] = await pool.query("INSERT INTO quiz_questions (question_text, question_type, order_index) VALUES (?, ?, ?)", 
      ['Choose your favorite riding destination', 'destination', 2]);
    const q2Id = q2.insertId;

    const destOpts = [
      { 
        text: 'Urban Nightscapes', 
        desc: 'Neon lights and city vibes.', 
        icon: 'Urban Nightscapes',
        metadata: { personality: 'Modern, stylish, urban, energetic', scene: 'Bright metropolitan night road, neon Dhaka city' }
      },
      { 
        text: 'Coastal Highways', 
        desc: 'Salty breeze and endless horizons.', 
        icon: 'Coastal Highways',
        metadata: { personality: 'Serene, free, refreshing', scene: 'Coxs Bazar Marine Drive at sunset, ocean breeze' }
      },
      { 
        text: 'Mountain Trails', 
        desc: 'Rugged terrain and breathtaking peaks.', 
        icon: 'Mountain Trails',
        metadata: { personality: 'Adventurous, brave, rugged', scene: 'Winding Sajek Valley mountain roads, misty morning' }
      }
    ];

    for (const opt of destOpts) {
      await pool.query("INSERT INTO quiz_options (question_id, option_text, option_desc, icon_name, metadata) VALUES (?, ?, ?, ?, ?)",
        [q2Id, opt.text, opt.desc, opt.icon, JSON.stringify(opt.metadata)]);
    }

    // 3. Aspiration (Determines Color)
    const [q3] = await pool.query("INSERT INTO quiz_questions (question_text, question_type, order_index) VALUES (?, ?, ?)", 
      ['What is your ultimate riding aspiration?', 'aspiration', 3]);
    const q3Id = q3.insertId;

    const aspOpts = [
      { text: 'Racing Spirit', desc: 'The signature Yamaha racing blue.', icon: 'Iconic Blue', metadata: { color: 'Racing Blue' } },
      { text: 'Urban Edge', desc: 'Aggressive styling and dark side of Japan.', icon: 'Dark Side', metadata: { color: 'Midnight Black' } },
      { text: 'Ultimate Prestige', desc: 'Uncompromising power and premium finish.', icon: 'Dream Bike', metadata: { color: 'Luxury Silver' } }
    ];

    for (const opt of aspOpts) {
      await pool.query("INSERT INTO quiz_options (question_id, option_text, option_desc, icon_name, metadata) VALUES (?, ?, ?, ?, ?)",
        [q3Id, opt.text, opt.desc, opt.icon, JSON.stringify(opt.metadata)]);
    }

    console.log('✅ All data seeded successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

migrateFinalQuiz();
