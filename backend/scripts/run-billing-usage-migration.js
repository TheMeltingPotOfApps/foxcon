#!/usr/bin/env node
/**
 * Script to run the billing_usage table migration
 * Reads database credentials from .env file
 * 
 * Usage: node backend/scripts/run-billing-usage-migration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Get database credentials from environment
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USERNAME || 'sms_user',
  password: process.env.DB_PASSWORD || 'sms_password',
  database: process.env.DB_DATABASE || 'sms_platform',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function runMigration() {
  const client = new Client(dbConfig);

  try {
    console.log('Connecting to database...');
    console.log(`Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`Database: ${dbConfig.database}`);
    console.log(`User: ${dbConfig.user}`);
    
    await client.connect();
    console.log('✓ Connected to database\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../migrations/create-billing-usage-table.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration: create-billing-usage-table.sql\n');
    console.log('SQL:');
    console.log('─'.repeat(60));
    console.log(migrationSQL);
    console.log('─'.repeat(60));
    console.log('');

    // Execute the migration
    await client.query(migrationSQL);
    
    console.log('✓ Migration completed successfully!\n');

    // Verify the table was created
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'billing_usage'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✓ Verified: billing_usage table exists');

      // Get table info
      const tableInfo = await client.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'billing_usage'
        ORDER BY ordinal_position;
      `);

      console.log('\nTable structure:');
      console.log('─'.repeat(60));
      tableInfo.rows.forEach((row) => {
        console.log(`  ${row.column_name.padEnd(30)} ${row.data_type.padEnd(20)} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });
      console.log('─'.repeat(60));

      // Get index info
      const indexInfo = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'billing_usage';
      `);

      if (indexInfo.rows.length > 0) {
        console.log('\nIndexes created:');
        indexInfo.rows.forEach((row) => {
          console.log(`  ✓ ${row.indexname}`);
        });
      }
    } else {
      throw new Error('Table was not created - verification failed');
    }

    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error.message);
    
    if (error.code) {
      console.error(`Error code: ${error.code}`);
    }
    
    if (error.detail) {
      console.error(`Detail: ${error.detail}`);
    }
    
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run the migration
runMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

