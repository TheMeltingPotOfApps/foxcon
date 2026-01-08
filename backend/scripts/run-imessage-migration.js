/**
 * Migration script to add iMessage support to messages table
 * Adds messageType enum and imessageId column
 * Run with: node backend/scripts/run-imessage-migration.js
 */

const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 5432;
const dbUser = process.env.DB_USERNAME || 'sms_user';
const dbPassword = process.env.DB_PASSWORD || 'sms_password';
const dbName = process.env.DB_DATABASE || 'sms_platform';

const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

try {
  console.log('Running migration to add iMessage support to messages table...');
  execSync(`psql "${connectionString}" -f "${path.join(__dirname, '../migrations/add-imessage-support-to-messages.sql')}"`, {
    stdio: 'inherit',
  });
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
