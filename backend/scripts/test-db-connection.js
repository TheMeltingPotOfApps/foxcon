#!/usr/bin/env node
/**
 * Test database connection with current configuration
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { Client } = require('pg');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'sms_platform',
  user: process.env.DB_USERNAME || 'sms_user',
  password: process.env.DB_PASSWORD || 'sms_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 10000,
};

console.log('=== Database Connection Test ===\n');
console.log('Configuration:');
console.log(`  Host: ${dbConfig.host}`);
console.log(`  Port: ${dbConfig.port}`);
console.log(`  Database: ${dbConfig.database}`);
console.log(`  Username: ${dbConfig.user}`);
console.log(`  SSL: ${dbConfig.ssl ? 'enabled' : 'disabled'}`);
console.log('');

const client = new Client(dbConfig);

async function testConnection() {
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✓ Connection successful!\n');

    // Test query
    console.log('Testing query execution...');
    const result = await client.query('SELECT version(), current_database(), current_user, now()');
    console.log('✓ Query executed successfully\n');

    console.log('Database Info:');
    console.log(`  Version: ${result.rows[0].version.split(',')[0]}`);
    console.log(`  Database: ${result.rows[0].current_database}`);
    console.log(`  User: ${result.rows[0].current_user}`);
    console.log(`  Server Time: ${result.rows[0].now}\n`);

    // Check connection pool settings
    console.log('Checking PostgreSQL connection settings...');
    const maxConnResult = await client.query('SHOW max_connections');
    const currentConnResult = await client.query(`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_queries,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `);

    console.log(`  Max Connections: ${maxConnResult.rows[0].max_connections}`);
    console.log(`  Current Connections: ${currentConnResult.rows[0].total_connections}`);
    console.log(`    - Active: ${currentConnResult.rows[0].active_queries}`);
    console.log(`    - Idle: ${currentConnResult.rows[0].idle_connections}\n`);

    // Check if tables exist
    console.log('Checking database schema...');
    const tableResult = await client.query(`
      SELECT count(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`  Tables: ${tableResult.rows[0].table_count}\n`);

    // Test connection pool settings
    console.log('Testing connection pool behavior...');
    const poolTestStart = Date.now();
    const poolTestPromises = [];
    for (let i = 0; i < 5; i++) {
      poolTestPromises.push(client.query('SELECT 1'));
    }
    await Promise.all(poolTestPromises);
    const poolTestTime = Date.now() - poolTestStart;
    console.log(`✓ Concurrent queries test: ${poolTestTime}ms\n`);

    console.log('=== All Tests Passed ===');
    console.log('✓ Connection is working correctly');
    console.log('✓ Database is accessible');
    console.log('✓ Queries execute successfully\n');

  } catch (error) {
    console.error('\n✗ Connection failed!\n');
    console.error('Error details:');
    console.error(`  Message: ${error.message}`);
    if (error.code) {
      console.error(`  Code: ${error.code}`);
    }
    if (error.host) {
      console.error(`  Host: ${error.host}`);
    }
    if (error.port) {
      console.error(`  Port: ${error.port}`);
    }
    console.error('\nTroubleshooting:');
    console.error('  1. Verify PostgreSQL is running');
    console.error('  2. Check DB_HOST, DB_PORT in .env file');
    console.error('  3. Verify DB_USERNAME and DB_PASSWORD are correct');
    console.error('  4. Check PostgreSQL pg_hba.conf allows connections');
    console.error('  5. Verify database exists');
    process.exit(1);
  } finally {
    await client.end();
  }
}

testConnection();
