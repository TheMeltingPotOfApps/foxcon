const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'sms_platform',
  user: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const migrationPath = path.join(__dirname, '../migrations/add-removal-criteria-to-journeys.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running removalCriteria column migration for journeys table...');
    await client.query(migrationSQL);
    console.log('✓ Migration completed successfully');

    // Verify column was added
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'journeys'
        AND column_name = 'removalCriteria'
      );
    `);

    if (result.rows[0].exists) {
      console.log('✓ removalCriteria column exists in journeys table');
    } else {
      console.log('⚠ removalCriteria column was not added');
    }

  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('✓ Column already exists, skipping migration');
    } else {
      console.error('✗ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

runMigration();

