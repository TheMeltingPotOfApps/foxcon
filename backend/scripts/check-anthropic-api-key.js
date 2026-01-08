const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'sms_platform',
  user: process.env.DB_USERNAME || 'sms_user',
  password: process.env.DB_PASSWORD || 'sms_password',
};

async function checkAnthropicApiKey() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const result = await client.query(
      'SELECT key, value, "isActive", description FROM system_configs WHERE key = $1',
      ['ANTHROPIC_API_KEY']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ ANTHROPIC_API_KEY not found in database');
    } else {
      const config = result.rows[0];
      console.log('📋 Current ANTHROPIC_API_KEY Configuration:');
      console.log(`   Key: ${config.key}`);
      console.log(`   Value: ${config.value ? config.value.substring(0, 20) + '...' : 'NULL'}`);
      console.log(`   Full Value: ${config.value || 'NULL'}`);
      console.log(`   Active: ${config.isActive}`);
      console.log(`   Description: ${config.description || 'N/A'}`);
      console.log(`   Full Length: ${config.value ? config.value.length : 0} characters`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkAnthropicApiKey();

