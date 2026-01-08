#!/usr/bin/env node
/**
 * Validate that NestJS database configuration matches environment variables
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

console.log('=== Database Configuration Validation ===\n');

// Read environment variables
const envConfig = {
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_USERNAME: process.env.DB_USERNAME || 'sms_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'sms_password',
  DB_DATABASE: process.env.DB_DATABASE || 'sms_platform',
  DB_SSL: process.env.DB_SSL === 'true',
  DB_MAX_CONNECTIONS: parseInt(process.env.DB_MAX_CONNECTIONS || '40', 10),
  DB_MIN_CONNECTIONS: parseInt(process.env.DB_MIN_CONNECTIONS || '5', 10),
};

console.log('Environment Variables (.env):');
console.log(`  DB_HOST=${envConfig.DB_HOST}`);
console.log(`  DB_PORT=${envConfig.DB_PORT}`);
console.log(`  DB_USERNAME=${envConfig.DB_USERNAME}`);
console.log(`  DB_PASSWORD=${envConfig.DB_PASSWORD ? '***' : '(not set)'}`);
console.log(`  DB_DATABASE=${envConfig.DB_DATABASE}`);
console.log(`  DB_SSL=${envConfig.DB_SSL}`);
console.log(`  DB_MAX_CONNECTIONS=${envConfig.DB_MAX_CONNECTIONS}`);
console.log(`  DB_MIN_CONNECTIONS=${envConfig.DB_MIN_CONNECTIONS}\n`);

// Simulate what getDatabaseConfig would return
const simulatedConfig = {
  type: 'postgres',
  host: envConfig.DB_HOST,
  port: envConfig.DB_PORT,
  username: envConfig.DB_USERNAME,
  password: envConfig.DB_PASSWORD,
  database: envConfig.DB_DATABASE,
  ssl: envConfig.DB_SSL ? { rejectUnauthorized: false } : false,
  extra: {
    max: envConfig.DB_MAX_CONNECTIONS,
    min: envConfig.DB_MIN_CONNECTIONS,
  },
};

console.log('Expected NestJS Configuration:');
console.log(`  Host: ${simulatedConfig.host}`);
console.log(`  Port: ${simulatedConfig.port}`);
console.log(`  Database: ${simulatedConfig.database}`);
console.log(`  Username: ${simulatedConfig.username}`);
console.log(`  SSL: ${simulatedConfig.ssl ? 'enabled' : 'disabled'}`);
console.log(`  Max Connections: ${simulatedConfig.extra.max}`);
console.log(`  Min Connections: ${simulatedConfig.extra.min}\n`);

// Validate configuration
console.log('Validation:');
let isValid = true;

if (!envConfig.DB_HOST) {
  console.log('  ✗ DB_HOST is not set');
  isValid = false;
} else {
  console.log('  ✓ DB_HOST is set');
}

if (!envConfig.DB_PORT || envConfig.DB_PORT < 1 || envConfig.DB_PORT > 65535) {
  console.log('  ✗ DB_PORT is invalid');
  isValid = false;
} else {
  console.log(`  ✓ DB_PORT is valid (${envConfig.DB_PORT})`);
}

if (!envConfig.DB_USERNAME) {
  console.log('  ✗ DB_USERNAME is not set');
  isValid = false;
} else {
  console.log('  ✓ DB_USERNAME is set');
}

if (!envConfig.DB_PASSWORD) {
  console.log('  ✗ DB_PASSWORD is not set');
  isValid = false;
} else {
  console.log('  ✓ DB_PASSWORD is set');
}

if (!envConfig.DB_DATABASE) {
  console.log('  ✗ DB_DATABASE is not set');
  isValid = false;
} else {
  console.log('  ✓ DB_DATABASE is set');
}

if (envConfig.DB_MAX_CONNECTIONS < 1 || envConfig.DB_MAX_CONNECTIONS > 200) {
  console.log(`  ✗ DB_MAX_CONNECTIONS is out of range (${envConfig.DB_MAX_CONNECTIONS})`);
  isValid = false;
} else {
  console.log(`  ✓ DB_MAX_CONNECTIONS is valid (${envConfig.DB_MAX_CONNECTIONS})`);
}

if (envConfig.DB_MIN_CONNECTIONS < 0 || envConfig.DB_MIN_CONNECTIONS > envConfig.DB_MAX_CONNECTIONS) {
  console.log(`  ✗ DB_MIN_CONNECTIONS is invalid (${envConfig.DB_MIN_CONNECTIONS})`);
  isValid = false;
} else {
  console.log(`  ✓ DB_MIN_CONNECTIONS is valid (${envConfig.DB_MIN_CONNECTIONS})`);
}

console.log('');

// Test actual connection with this config
const { Client } = require('pg');
const testClient = new Client({
  host: simulatedConfig.host,
  port: simulatedConfig.port,
  database: simulatedConfig.database,
  user: simulatedConfig.username,
  password: simulatedConfig.password,
  ssl: simulatedConfig.ssl,
});

console.log('Testing connection with this configuration...');
testClient.connect()
  .then(() => {
    console.log('  ✓ Connection successful\n');
    return testClient.query('SELECT current_database(), current_user');
  })
  .then((result) => {
    console.log('Connection Details:');
    console.log(`  Connected to: ${result.rows[0].current_database}`);
    console.log(`  As user: ${result.rows[0].current_user}\n`);
    return testClient.end();
  })
  .then(() => {
    console.log('=== Configuration Validation Complete ===');
    if (isValid) {
      console.log('✓ All configuration values are valid');
      console.log('✓ Connection test successful');
      console.log('\nThe database configuration is correct and ready to use.');
    } else {
      console.log('⚠ Some configuration issues were found');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n✗ Connection test failed!');
    console.error(`  Error: ${error.message}`);
    console.error('\nPlease check:');
    console.error('  1. PostgreSQL is running');
    console.error('  2. Database credentials are correct');
    console.error('  3. Database exists');
    console.error('  4. Network connectivity');
    process.exit(1);
  });
