import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testSlotGeneration() {
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
    const tenantId = '5246a145-c7b3-4e7e-b05e-4921ff3d064e';
    
    // Test date range
    const startDate = new Date('2025-12-27T00:00:00.000Z');
    const endDate = new Date('2026-01-26T23:59:59.999Z');
    const testDate = new Date('2026-01-01T00:00:00.000Z');
    
    console.log(`\n🔍 Testing slot generation`);
    console.log(`Start Date: ${startDate.toISOString()}`);
    console.log(`End Date: ${endDate.toISOString()}`);
    console.log(`Test Date (Jan 1): ${testDate.toISOString()}\n`);
    
    // Get event type duration
    const eventType = await dataSource.query(
      `SELECT id, "durationMinutes" FROM event_types WHERE id = $1`,
      [eventTypeId]
    );
    
    const duration = eventType[0]?.durationMinutes || 30;
    console.log(`Event duration: ${duration} minutes\n`);
    
    // Get availability
    const availabilities = await dataSource.query(
      `SELECT id, "weeklySchedule", "startDate", "endDate", "blockedDates", "isActive"
       FROM availabilities 
       WHERE "eventTypeId" = $1 
       AND "isActive" = true`,
      [eventTypeId]
    );
    
    // Check if testDate falls within availability date ranges
    availabilities.forEach((avail: any) => {
      console.log(`Availability ${avail.id.substring(0, 8)}...`);
      
      if (avail.startDate) {
        const availStart = new Date(avail.startDate);
        console.log(`  Start Date: ${availStart.toISOString()}`);
        console.log(`  Test date >= Start: ${testDate >= availStart}`);
      }
      
      if (avail.endDate) {
        const availEnd = new Date(avail.endDate);
        availEnd.setHours(23, 59, 59, 999);
        console.log(`  End Date: ${availEnd.toISOString()}`);
        console.log(`  Test date <= End: ${testDate <= availEnd}`);
      }
      
      // Check if slot would be within the requested range
      console.log(`  Slot >= startDate: ${testDate >= startDate}`);
      console.log(`  Slot < endDate: ${testDate < endDate}`);
      console.log('');
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

testSlotGeneration();
