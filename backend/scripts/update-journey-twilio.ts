import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function updateJourneyToTwilio() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_DATABASE || process.env.DB_NAME || 'sms',
    username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    entities: ['src/entities/*.entity.ts'],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    const journeyId = 'c6c107b1-c8c6-479e-926b-667040150e5e';

    // Get the journey
    const journey = await dataSource.query(
      'SELECT id, "tenantId", name FROM journeys WHERE id = $1',
      [journeyId]
    );

    if (journey.length === 0) {
      console.error(`Journey ${journeyId} not found`);
      process.exit(1);
    }

    console.log(`Found journey: ${journey[0].name} (Tenant: ${journey[0].tenantId})`);

    // Get all MAKE_CALL nodes
    const nodes = await dataSource.query(
      `SELECT id, type, config FROM journey_nodes 
       WHERE "journeyId" = $1 AND type = 'MAKE_CALL'`,
      [journeyId]
    );

    console.log(`Found ${nodes.length} MAKE_CALL nodes`);

    if (nodes.length === 0) {
      console.log('No MAKE_CALL nodes found to update');
      await dataSource.destroy();
      return;
    }

    // Update each node
    for (const node of nodes) {
      const currentConfig = node.config || {};
      const updatedConfig = {
        ...currentConfig,
        didPoolType: 'Twilio'
      };

      await dataSource.query(
        `UPDATE journey_nodes 
         SET config = $1, "updatedAt" = NOW()
         WHERE id = $2`,
        [JSON.stringify(updatedConfig), node.id]
      );

      console.log(`✅ Updated node ${node.id} - Set didPoolType to 'Twilio'`);
    }

    console.log(`\n🎉 Successfully updated ${nodes.length} MAKE_CALL nodes to use Twilio trunk`);
    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

updateJourneyToTwilio();
