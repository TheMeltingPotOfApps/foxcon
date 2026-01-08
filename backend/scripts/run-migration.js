const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USERNAME = process.env.DB_USERNAME || 'sms_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'sms_password';
const DB_DATABASE = process.env.DB_DATABASE || 'sms_platform';

const migrationSQL = fs.readFileSync(
  path.join(__dirname, '../migrations/fix-journey-node-positions.sql'),
  'utf8'
);

const connectionString = `postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;

try {
  console.log('Running migration to fix journey_node position columns...');
  execSync(`psql "${connectionString}" -c "${migrationSQL.replace(/\n/g, ' ')}"`, {
    stdio: 'inherit',
    env: { ...process.env, PGPASSWORD: DB_PASSWORD }
  });
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

