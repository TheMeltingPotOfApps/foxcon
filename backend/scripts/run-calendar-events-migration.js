const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5433;
const DB_USERNAME = process.env.DB_USERNAME || 'sms_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'sms_password';
const DB_DATABASE = process.env.DB_DATABASE || 'sms_platform';

const migrationFile = path.join(__dirname, '../migrations/create-calendar-events-table.sql');

console.log('Running calendar_events table migration...');
console.log(`Database: ${DB_DATABASE}@${DB_HOST}:${DB_PORT}`);

try {
  // Execute SQL file directly using psql -f
  const command = `PGPASSWORD="${DB_PASSWORD}" psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USERNAME} -d ${DB_DATABASE} -f ${migrationFile}`;
  
  execSync(command, { stdio: 'inherit', env: { ...process.env, PGPASSWORD: DB_PASSWORD } });
  
  console.log('✓ Calendar events table migration completed successfully');
} catch (error) {
  console.error('✗ Migration failed:', error.message);
  process.exit(1);
}

