#!/usr/bin/env node

/**
 * Migration script to add voicePresetId column to voice_templates table
 * Run with: node backend/scripts/run-voice-preset-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  // Use environment variables from .env file
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    database: process.env.DB_DATABASE || 'sms_platform',
    user: process.env.DB_USERNAME || 'sms_user',
    password: process.env.DB_PASSWORD || 'sms_password',
  };

  console.log('📋 Database configuration:');
  console.log(`   Host: ${dbConfig.host}`);
  console.log(`   Port: ${dbConfig.port}`);
  console.log(`   Database: ${dbConfig.database}`);
  console.log(`   User: ${dbConfig.user}`);
  console.log('');

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/add-voice-preset-to-voice-templates.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'voice_templates' AND column_name = 'voicePresetId';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: voicePresetId column exists');
    } else {
      console.log('⚠️  Warning: voicePresetId column not found after migration');
    }
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === '42703') {
      console.log('ℹ️  This might mean the column already exists or there\'s a different issue');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
