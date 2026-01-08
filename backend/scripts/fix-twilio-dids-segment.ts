import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixTwilioDidsSegment() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'sms',
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    const tenantId = '5246a145-c7b3-4e7e-b05e-4921ff3d064e';

    // Find DIDs with TWILIO trunk but no twilio segment
    const twilioDids = await dataSource.query(
      `SELECT id, number, segment, trunk, status 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND (segment IS NULL OR segment NOT ILIKE 'twilio%')`,
      [tenantId]
    );

    console.log(`Found ${twilioDids.length} DIDs with TWILIO trunk but no twilio segment\n`);

    if (twilioDids.length === 0) {
      console.log('No DIDs to update.');
      await dataSource.destroy();
      return;
    }

    // Update them to have segment='twilio-main'
    const result = await dataSource.query(
      `UPDATE asterisk_dids 
       SET segment = 'twilio-main', "updatedAt" = NOW()
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND (segment IS NULL OR segment NOT ILIKE 'twilio%')`,
      [tenantId]
    );

    console.log(`✅ Updated ${result[1]} DIDs to have segment='twilio-main'\n`);

    // Verify the update
    const verify = await dataSource.query(
      `SELECT COUNT(*) as count 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND segment ILIKE 'twilio%'
       AND status = 'ACTIVE'`,
      [tenantId]
    );

    console.log(`🎯 Active Twilio Pool DIDs: ${verify[0].count}`);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

fixTwilioDidsSegment();
