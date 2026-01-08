const { execSync } = require('child_process');
const path = require('path');

const migrationFile = path.join(__dirname, '../migrations/create-notifications-tables.sql');

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_DATABASE || process.env.DB_NAME || 'sms_platform';
const dbUser = process.env.DB_USERNAME || process.env.DB_USER || 'sms_user';
const dbPassword = process.env.DB_PASSWORD || 'sms_password';

const command = `PGPASSWORD="${dbPassword}" psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f ${migrationFile}`;

try {
  console.log('Running notifications migration...');
  execSync(command, { stdio: 'inherit' });
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}

