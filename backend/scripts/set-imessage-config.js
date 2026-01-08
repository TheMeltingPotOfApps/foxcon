/**
 * Script to configure iMessage API URL and API Key
 * Run with: node backend/scripts/set-imessage-config.js
 */

const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USERNAME || 'sms_user',
  password: process.env.DB_PASSWORD || 'sms_password',
  database: process.env.DB_DATABASE || 'sms_platform',
};

async function setImessageConfig() {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    console.log('Connected to database');

    // Get values from command line arguments or use defaults
    const apiUrl = process.argv[2] || 'https://unpickable-implicatively-myrta.ngrok-free.dev';
    const apiKey = process.argv[3] || '';

    console.log(`Setting IMESSAGE_API_URL to: ${apiUrl}`);
    
    // Set IMESSAGE_API_URL
    await client.query(
      `INSERT INTO system_configs (key, value, description, "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, true, NOW(), NOW())
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, description = $3, "updatedAt" = NOW()`,
      [
        'IMESSAGE_API_URL',
        apiUrl,
        'iMessage API server URL for Send Blue functionality'
      ]
    );

    if (apiKey) {
      console.log(`Setting IMESSAGE_API_KEY...`);
      await client.query(
        `INSERT INTO system_configs (key, value, description, "isActive", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, true, NOW(), NOW())
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, description = $3, "updatedAt" = NOW()`,
        [
          'IMESSAGE_API_KEY',
          apiKey,
          'API key for authenticating with iMessage API'
        ]
      );
      console.log('✅ IMESSAGE_API_KEY configured');
    } else {
      console.log('⚠️  IMESSAGE_API_KEY not provided. You can set it later via the settings page or by running:');
      console.log('   node backend/scripts/set-imessage-config.js <api_url> <api_key>');
    }

    console.log('✅ IMESSAGE_API_URL configured successfully!');
    console.log('\n📝 Configuration:');
    console.log(`   API URL: ${apiUrl}`);
    console.log(`   API Key: ${apiKey || 'Not set (configure via settings)'}`);
    console.log('\n💡 Note: Restart the backend service for changes to take effect.');
    
  } catch (error) {
    console.error('❌ Error setting iMessage config:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setImessageConfig();
