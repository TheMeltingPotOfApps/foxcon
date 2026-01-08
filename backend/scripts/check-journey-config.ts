import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function checkJourneyConfig() {
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

    // Get all MAKE_CALL nodes with their full config
    const nodes = await dataSource.query(
      `SELECT id, type, config FROM journey_nodes 
       WHERE "journeyId" = $1 AND type = 'MAKE_CALL'
       LIMIT 5`,
      [journeyId]
    );

    console.log(`\n📊 Sample of MAKE_CALL Node Configurations:\n`);
    
    nodes.forEach((node: any) => {
      const config = node.config || {};
      const didPoolType = config.didPoolType || 'not set';
      console.log(`Node ${node.id.substring(0, 8)}...`);
      console.log(`  didPoolType: ${didPoolType}`);
      console.log(`  Full config: ${JSON.stringify(config, null, 2)}`);
      console.log('');
    });

    // Count by type
    const mcCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM journey_nodes 
       WHERE "journeyId" = $1 
       AND type = 'MAKE_CALL'
       AND (config->>'didPoolType' = 'MC' OR config->>'didPoolType' IS NULL)`,
      [journeyId]
    );

    const twilioCount = await dataSource.query(
      `SELECT COUNT(*) as count FROM journey_nodes 
       WHERE "journeyId" = $1 
       AND type = 'MAKE_CALL'
       AND config->>'didPoolType' = 'Twilio'`,
      [journeyId]
    );

    console.log(`\n📈 Summary:`);
    console.log(`MC trunk: ${mcCount[0].count} nodes`);
    console.log(`Twilio trunk: ${twilioCount[0].count} nodes`);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

checkJourneyConfig();
