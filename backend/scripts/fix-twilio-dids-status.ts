import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixTwilioDidsStatus() {
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

    // Update status from 'active' to 'available' for Twilio DIDs
    // The enum uses lowercase: DidStatus.AVAILABLE = 'available'
    const result = await dataSource.query(
      `UPDATE asterisk_dids 
       SET status = 'available', "updatedAt" = NOW()
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND segment ILIKE 'twilio%'
       AND status = 'active'`,
      [tenantId]
    );

    console.log(`✅ Updated ${result[1]} DIDs from status='active' to status='available'\n`);

    // Verify the update
    const verify = await dataSource.query(
      `SELECT COUNT(*) as count 
       FROM asterisk_dids 
       WHERE "tenantId" = $1 
       AND trunk = 'TWILIO'
       AND segment ILIKE 'twilio%'
       AND status = 'available'`,
      [tenantId]
    );

    console.log(`🎯 Available Twilio Pool DIDs: ${verify[0].count}`);

    if (parseInt(verify[0].count) > 0) {
      console.log('\n✅ Twilio DIDs are now ready for use!');
      console.log('The journey should now be able to make calls using Twilio trunk.');
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

fixTwilioDidsStatus();
