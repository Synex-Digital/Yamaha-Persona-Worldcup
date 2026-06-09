require('dotenv').config({ path: '.env.local' });
const mysql = require('mysql2/promise');

const countries = [
  { name: 'France', name_bn: 'ফ্রান্স', stadium: 'Stade de France', jersey: 'navy blue and white', theme: 'blue, white, and red' },
  { name: 'Spain', name_bn: 'স্পেন', stadium: 'Santiago Bernabéu Stadium', jersey: 'red with yellow accents', theme: 'red and gold' },
  { name: 'Argentina', name_bn: 'আর্জেন্টিনা', stadium: 'Lusail Stadium', jersey: 'light blue and white vertical stripes', theme: 'light blue and white' },
  { name: 'England', name_bn: 'ইংল্যান্ড', stadium: 'Wembley Stadium', jersey: 'white and navy blue', theme: 'red and white' },
  { name: 'Portugal', name_bn: 'পর্তুগাল', stadium: 'Estádio da Luz', jersey: 'red and green', theme: 'red and green' },
  { name: 'Brazil', name_bn: 'ব্রাজিল', stadium: 'Maracanã Stadium', jersey: 'vibrant yellow and green', theme: 'yellow and green' },
  { name: 'Netherlands', name_bn: 'নেদারল্যান্ডস', stadium: 'Johan Cruyff Arena', jersey: 'vibrant orange', theme: 'orange' },
  { name: 'Morocco', name_bn: 'মরক্কো', stadium: 'Stade Mohammed V', jersey: 'red and green', theme: 'red and green' },
  { name: 'Belgium', name_bn: 'বেলজিয়াম', stadium: 'King Baudouin Stadium', jersey: 'red and black', theme: 'red, black, and yellow' },
  { name: 'Germany', name_bn: 'জার্মানি', stadium: 'Allianz Arena', jersey: 'white with black, red, and gold accents', theme: 'black, red, and gold' },
  { name: 'Croatia', name_bn: 'ক্রোয়েশিয়া', stadium: 'Maksimir Stadium', jersey: 'red and white checkerboard', theme: 'red and white' },
  { name: 'Colombia', name_bn: 'কলম্বিয়া', stadium: 'Metropolitano Roberto Meléndez', jersey: 'yellow, blue, and red', theme: 'yellow and blue' },
  { name: 'Senegal', name_bn: 'সেনেগাল', stadium: 'Stade Abdoulaye Wade', jersey: 'white and green', theme: 'green and yellow' },
  { name: 'Mexico', name_bn: 'মেক্সিকো', stadium: 'Azteca Stadium', jersey: 'vibrant green and white', theme: 'green, white, and red' },
  { name: 'United States', name_bn: 'মার্কিন যুক্তরাষ্ট্র', stadium: 'MetLife Stadium', jersey: 'white with red and blue accents', theme: 'red, white, and blue' },
  { name: 'Uruguay', name_bn: 'উরুগুয়ে', stadium: 'Centenario Stadium', jersey: 'sky blue and black', theme: 'sky blue' },
  { name: 'Japan', name_bn: 'জাপান', stadium: 'Japan National Stadium', jersey: 'samurai blue and white', theme: 'blue and white' },
  { name: 'Switzerland', name_bn: 'সুইজারল্যান্ড', stadium: 'Wankdorf Stadium', jersey: 'red and white', theme: 'red and white' },
  { name: 'IR Iran', name_bn: 'ইরান', stadium: 'Azadi Stadium', jersey: 'white and red-green', theme: 'green, white, and red' },
  { name: 'Türkiye', name_bn: 'তুরস্ক', stadium: 'Atatürk Olympic Stadium', jersey: 'red and white', theme: 'red and white' },
  { name: 'Ecuador', name_bn: 'ইকুয়েডর', stadium: 'Estadio Olímpico Atahualpa', jersey: 'yellow and blue', theme: 'yellow and blue' },
  { name: 'Austria', name_bn: 'অস্ট্রিয়া', stadium: 'Ernst-Happel-Stadion', jersey: 'red and white', theme: 'red and white' },
  { name: 'South Korea', name_bn: 'দক্ষিণ কোরিয়া', stadium: 'Seoul World Cup Stadium', jersey: 'red and dark blue', theme: 'red and blue' },
  { name: 'Australia', name_bn: 'অস্ট্রেলিয়া', stadium: 'Stadium Australia', jersey: 'gold and green', theme: 'green and gold' },
  { name: 'Algeria', name_bn: 'আলজেরিয়া', stadium: 'Stade du 5 Juillet', jersey: 'white and green', theme: 'green and white' },
  { name: 'Egypt', name_bn: 'মিশর', stadium: 'Cairo International Stadium', jersey: 'red and white', theme: 'red, white, and black' },
  { name: 'Canada', name_bn: 'কানাডা', stadium: 'BC Place Stadium', jersey: 'vibrant red and white', theme: 'red and white' },
  { name: 'Norway', name_bn: 'নরওয়ে', stadium: 'Ullevaal Stadion', jersey: 'red and blue', theme: 'red, white, and blue' },
  { name: 'Panama', name_bn: 'পানামা', stadium: 'Estadio Rommel Fernández', jersey: 'red and white', theme: 'red and white' },
  { name: 'Côte d\'Ivoire', name_bn: 'কোত দিভোয়ার', stadium: 'Stade Alassane Ouattara', jersey: 'vibrant orange and green', theme: 'orange, white, and green' },
  { name: 'Sweden', name_bn: 'সুইডেন', stadium: 'Friends Arena', jersey: 'yellow and blue', theme: 'yellow and blue' },
  { name: 'Paraguay', name_bn: 'প্যারাগুয়ে', stadium: 'Estadio Defensores del Chaco', jersey: 'red and white vertical stripes', theme: 'red, white, and blue' },
  { name: 'Czechia', name_bn: 'চেকিয়া', stadium: 'Fortuna Arena', jersey: 'red and white', theme: 'red, white, and blue' },
  { name: 'Scotland', name_bn: 'স্কটল্যান্ড', stadium: 'Hampden Park', jersey: 'dark blue and white', theme: 'blue and white' },
  { name: 'Tunisia', name_bn: 'তিউনিসিয়া', stadium: 'Stade Olympique de Radès', jersey: 'white and red', theme: 'red and white' },
  { name: 'Congo DR', name_bn: 'ডিআর কঙ্গো', stadium: 'Stade des Martyrs', jersey: 'blue and red', theme: 'blue, yellow, and red' },
  { name: 'Uzbekistan', name_bn: 'উজবেকিস্তান', stadium: 'Bunyodkor Stadium', jersey: 'blue and white', theme: 'blue and white' },
  { name: 'Qatar', name_bn: 'কাতার', stadium: 'Lusail Stadium', jersey: 'maroon and white', theme: 'maroon and white' },
  { name: 'Iraq', name_bn: 'ইরাক', stadium: 'Basra International Stadium', jersey: 'green and white', theme: 'green and white' },
  { name: 'South Africa', name_bn: 'দক্ষিণ আফ্রিকা', stadium: 'FNB Stadium (Soccer City)', jersey: 'yellow and green', theme: 'yellow, green, and black' },
  { name: 'Saudi Arabia', name_bn: 'সৌদি আরব', stadium: 'King Fahd International Stadium', jersey: 'green and white', theme: 'green and white' },
  { name: 'Jordan', name_bn: 'জর্ডান', stadium: 'Amman International Stadium', jersey: 'white and red', theme: 'red and white' },
  { name: 'Bosnia and Herzegovina', name_bn: 'বসনিয়া ও হার্জেগোভিনা', stadium: 'Bilino Polje Stadium', jersey: 'blue and yellow', theme: 'blue and yellow' },
  { name: 'Cape Verde', name_bn: 'কেপ ভার্দে', stadium: 'Estádio Nacional de Cabo Verde', jersey: 'blue and yellow', theme: 'blue, white, and red' },
  { name: 'Ghana', name_bn: 'ঘানা', stadium: 'Baba Yara Stadium', jersey: 'white and red-yellow-green', theme: 'red, yellow, and green' },
  { name: 'Curaçao', name_bn: 'কুরাসাও', stadium: 'Ergilio Hato Stadium', jersey: 'blue and yellow', theme: 'blue and yellow' },
  { name: 'Haiti', name_bn: 'হাইতি', stadium: 'Stade Sylvio Cator', jersey: 'blue and red', theme: 'blue and red' },
  { name: 'New Zealand', name_bn: 'নিউজিল্যান্ড', stadium: 'Eden Park', jersey: 'all-black or white with black trim', theme: 'black and white' }
];

async function seedWorldCup() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'yamaha_ai',
  });

  try {
    // 1. Add settings row if not exists
    console.log('Checking / Inserting app_settings row...');
    await connection.query(`
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES ('worldcup_camp_enabled', 'false')
      ON DUPLICATE KEY UPDATE setting_key = setting_key
    `);

    // 2. Insert Question 5
    console.log('Checking / Inserting quiz_questions row (ID: 5)...');
    await connection.query(`
      INSERT INTO quiz_questions (id, question_text, question_text_bn, question_type, order_index)
      VALUES (5, 'Choose Your Favourite Nation', 'আপনার প্রিয় দেশ নির্বাচন করুন', 'destination', 3)
      ON DUPLICATE KEY UPDATE question_text = VALUES(question_text), question_text_bn = VALUES(question_text_bn), order_index = VALUES(order_index)
    `);

    // 3. Clear existing options for Question 5 to avoid duplication
    console.log('Cleaning existing options for Question 5...');
    await connection.query('DELETE FROM quiz_options WHERE question_id = 5');

    // 4. Insert options in exact ranking order
    console.log(`Inserting ${countries.length} country options in ranking order...`);

    // Check if worldcup campaign mode is currently active to decide initial status of new options
    const [settingRows] = await connection.query(`
      SELECT setting_value FROM app_settings WHERE setting_key = 'worldcup_camp_enabled'
    `);
    const isWcActive = settingRows[0]?.setting_value === 'true';

    for (const c of countries) {
      const metadata = {
        country: c.name,
        country_bn: c.name_bn,
        jersey_colors: c.jersey,
        theme_colors: c.theme,
        stadium: c.stadium,
        personality: `Proud ${c.name} supporter, ${c.theme} football spirit.`,
        personality_bn: `গর্বিত ${c.name_bn} সমর্থক, ফুটবল উদ্দীপনা।`,
        scene: `Outside ${c.stadium}, damp pavement, soft stadium lighting. ${c.name} flag in the sky. blurred crowds in the distant background wearing ${c.jersey} jerseys. ${c.theme} confetti. festive banners.`
      };

      await connection.query(`
        INSERT INTO quiz_options (question_id, option_text, option_text_bn, option_desc, option_desc_bn, icon_name, metadata, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        5,
        c.name,
        c.name_bn,
        `Support ${c.name} in World Cup 2026.`,
        `২০২৬ বিশ্বকাপে ${c.name_bn} দলকে সমর্থন করুন।`,
        '',
        JSON.stringify(metadata),
        isWcActive ? 1 : 0
      ]);
    }

    console.log('✅ World Cup data re-seeded in custom ranking order successfully!');

  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await connection.end();
  }
}

seedWorldCup();
