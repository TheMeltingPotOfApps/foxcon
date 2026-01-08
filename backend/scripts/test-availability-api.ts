import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testAvailabilityAPI() {
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
    
    const eventTypeId = '9cf34723-45cc-4a75-aa4f-54d3c3d64fc2';
    
    // Simulate what the API does
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);
    
    console.log(`\n🔍 Testing availability API for event type: ${eventTypeId}`);
    console.log(`Date range: ${startDate.toISOString()} to ${endDate.toISOString()}\n`);
    
    // Get event type
    const eventType = await dataSource.query(
      `SELECT id, name, "tenantId" FROM event_types WHERE id = $1`,
      [eventTypeId]
    );
    
    if (eventType.length === 0) {
      console.log('❌ Event type not found!');
      await dataSource.destroy();
      return;
    }
    
    console.log(`Event Type: ${eventType[0].name}`);
    console.log(`Tenant ID: ${eventType[0].tenantId}\n`);
    
    // Get availability (with the new query logic)
    const availabilities = await dataSource.query(
      `SELECT id, "assignedToUserId", "weeklySchedule", "startDate", "endDate", "blockedDates", "isActive"
       FROM availabilities 
       WHERE "eventTypeId" = $1 
       AND "isActive" = true
       AND ("assignedToUserId" IS NULL OR "assignedToUserId" = $2)`,
      [eventTypeId, null] // Test with null assignedToUserId
    );
    
    console.log(`Found ${availabilities.length} availability records (including "all users")\n`);
    
    if (availabilities.length === 0) {
      console.log('❌ No availability records found!');
      await dataSource.destroy();
      return;
    }
    
    // Check if any days are enabled
    availabilities.forEach((avail: any) => {
      const schedule = avail.weeklySchedule || {};
      const enabledDays = Object.keys(schedule).filter(
        (day) => schedule[day]?.enabled
      );
      console.log(`Availability ${avail.id.substring(0, 8)}...`);
      console.log(`  Enabled days: ${enabledDays.length}`);
      console.log(`  Assigned to: ${avail.assignedToUserId || 'All users'}`);
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

testAvailabilityAPI();
