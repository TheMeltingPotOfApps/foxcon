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
  console.log('Updating all DIDs to use "MC" as trunk name...');
  
  // First, check how many DIDs will be affected
  const countQuery = `SELECT COUNT(*) as count FROM asterisk_dids`;
  const countResult = execSync(
    `psql "${connectionString}" -t -c "${countQuery}"`,
    { env: { ...process.env, PGPASSWORD: DB_PASSWORD }, encoding: 'utf8' }
  );
  const totalCount = parseInt(countResult.trim()) || 0;
  
  console.log(`Found ${totalCount} DIDs in the database`);
  
  if (totalCount === 0) {
    console.log('No DIDs found. Nothing to update.');
    process.exit(0);
  }
  
  // Show current trunk distribution
  const trunkDistQuery = `SELECT trunk, COUNT(*) as count FROM asterisk_dids GROUP BY trunk`;
  console.log('\nCurrent trunk distribution:');
  execSync(
    `psql "${connectionString}" -c "${trunkDistQuery}"`,
    { env: { ...process.env, PGPASSWORD: DB_PASSWORD }, stdio: 'inherit' }
  );
  
  // Update all DIDs to use "MC" as trunk
  const updateQuery = `UPDATE asterisk_dids SET trunk = 'MC' WHERE trunk != 'MC' OR trunk IS NULL`;
  console.log('\nUpdating DIDs...');
  execSync(
    `psql "${connectionString}" -c "${updateQuery}"`,
    { env: { ...process.env, PGPASSWORD: DB_PASSWORD }, stdio: 'inherit' }
  );
  
  // Verify the update
  const verifyQuery = `SELECT COUNT(*) as count FROM asterisk_dids WHERE trunk = 'MC'`;
  const verifyResult = execSync(
    `psql "${connectionString}" -t -c "${verifyQuery}"`,
    { env: { ...process.env, PGPASSWORD: DB_PASSWORD }, encoding: 'utf8' }
  );
  const updatedCount = parseInt(verifyResult.trim()) || 0;
  
  console.log(`\n✅ Successfully updated ${updatedCount} DIDs to use "MC" as trunk name`);
  
  // Show final trunk distribution
  console.log('\nFinal trunk distribution:');
  execSync(
    `psql "${connectionString}" -c "${trunkDistQuery}"`,
    { env: { ...process.env, PGPASSWORD: DB_PASSWORD }, stdio: 'inherit' }
  );
  
} catch (error) {
  console.error('❌ Update failed:', error.message);
  process.exit(1);
}

