import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function verifyJourneyTrunk() {
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
    const journeyId = 'c6c107b1-c8c6-479e-926b-667040150e5e';

    // Get all MAKE_CALL nodes
    const nodes = await dataSource.query(
      `SELECT id, type, config->>'didPoolType' as didPoolType FROM journey_nodes 
       WHERE "journeyId" = $1 AND type = 'MAKE_CALL'`,
      [journeyId]
    );

    console.log(`\n📊 Journey ${journeyId} - MAKE_CALL Node Configuration:\n`);
    
    const mcNodes = nodes.filter(n => !n.didPoolType || n.didPoolType === 'MC');
    const twilioNodes = nodes.filter(n => n.didPoolType === 'Twilio');
    
    console.log(`Total MAKE_CALL nodes: ${nodes.length}`);
    console.log(`MC trunk: ${mcNodes.length} nodes`);
    console.log(`Twilio trunk: ${twilioNodes.length} nodes`);
    
    if (twilioNodes.length > 0) {
      console.log(`\n⚠️  Warning: ${twilioNodes.length} nodes still using Twilio trunk:`);
      twilioNodes.forEach(n => console.log(`   - ${n.id}`));
    } else {
      console.log(`\n✅ All nodes are using MC trunk (default)`);
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

verifyJourneyTrunk();
