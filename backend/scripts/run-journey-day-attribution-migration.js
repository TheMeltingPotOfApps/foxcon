#!/usr/bin/env node

/**
 * Migration script runner for updating journey nodes with day attribution
 * 
 * Usage: node run-journey-day-attribution-migration.js
 */

const { execSync } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

try {
  console.log('🔄 Running migration to update journey nodes with day attribution...');
  console.log('   This ensures TIME_DELAY nodes are properly attributed to days\n');
  
  // Run the TypeScript migration script using ts-node
  execSync(
    `npx ts-node "${path.join(__dirname, 'update-journey-nodes-day-attribution.ts')}"`,
    {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' },
    }
  );
  
  console.log('\n✅ Migration completed successfully!');
} catch (error) {
  console.error('\n❌ Migration failed:', error.message);
  process.exit(1);
}

