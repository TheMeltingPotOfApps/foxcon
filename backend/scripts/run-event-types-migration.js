const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USERNAME = process.env.DB_USERNAME || 'sms_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'sms_password';
const DB_DATABASE = process.env.DB_DATABASE || 'sms_platform';

const connectionString = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

try {
  console.log('Running migration to create event_types and availabilities tables...');
  execSync(`psql "${connectionString}" -f "${path.join(__dirname, '../migrations/create-event-types-and-availability.sql')}"`, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: DB_PASSWORD }
  });
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

