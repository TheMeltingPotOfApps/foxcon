const { Client } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'sms_platform',
  user: process.env.DB_USERNAME || 'sms_user',
  password: process.env.DB_PASSWORD || 'sms_password',
};

async function checkActiveVoiceCampaigns() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check for voice messages that are currently being generated
    console.log('📊 Checking for active voice campaign generation...\n');
    
    const activeGenerationQuery = `
      SELECT 
        vm.id,
        vm."campaignId",
        vm."voiceTemplateId",
        vm.status,
        vm."createdAt",
        vm."updatedAt",
        c.name as campaign_name,
        vt.name as template_name,
        COUNT(*) OVER (PARTITION BY vm."campaignId") as total_messages_in_campaign,
        COUNT(*) FILTER (WHERE vm.status = 'GENERATING') OVER (PARTITION BY vm."campaignId") as generating_count,
        COUNT(*) FILTER (WHERE vm.status = 'PENDING') OVER (PARTITION BY vm."campaignId") as pending_count,
        COUNT(*) FILTER (WHERE vm.status = 'QUEUED') OVER (PARTITION BY vm."campaignId") as queued_count
      FROM voice_messages vm
      LEFT JOIN campaigns c ON c.id = vm."campaignId"
      LEFT JOIN voice_templates vt ON vt.id = vm."voiceTemplateId"
      WHERE vm.status IN ('GENERATING', 'PENDING', 'QUEUED')
      ORDER BY vm."campaignId", vm."createdAt" DESC
      LIMIT 50;
    `;

    const result = await client.query(activeGenerationQuery);
    
    if (result.rows.length === 0) {
      console.log('ℹ️  No active voice campaign generation found\n');
    } else {
      console.log(`Found ${result.rows.length} voice messages in active generation:\n`);
      
      // Group by campaign
      const campaigns = {};
      result.rows.forEach(row => {
        const campaignId = row.campaignId || 'unknown';
        if (!campaigns[campaignId]) {
          campaigns[campaignId] = {
            campaignId,
            campaignName: row.campaign_name || 'Unknown Campaign',
            templateName: row.template_name || 'Unknown Template',
            totalMessages: row.total_messages_in_campaign,
            generating: row.generating_count,
            pending: row.pending_count,
            queued: row.queued_count,
            messages: []
          };
        }
        campaigns[campaignId].messages.push({
          id: row.id,
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt
        });
      });

      Object.values(campaigns).forEach((campaign, idx) => {
        console.log(`\n📢 Campaign ${idx + 1}:`);
        console.log(`   Campaign ID: ${campaign.campaignId}`);
        console.log(`   Campaign Name: ${campaign.campaignName}`);
        console.log(`   Template: ${campaign.templateName}`);
        console.log(`   Total Messages: ${campaign.totalMessages}`);
        console.log(`   Status Breakdown:`);
        console.log(`     - GENERATING: ${campaign.generating}`);
        console.log(`     - PENDING: ${campaign.pending}`);
        console.log(`     - QUEUED: ${campaign.queued}`);
        console.log(`   Sample Messages (first 5):`);
        campaign.messages.slice(0, 5).forEach(msg => {
          console.log(`     - ${msg.id.substring(0, 8)}... | ${msg.status} | Created: ${msg.createdAt}`);
        });
      });
    }

    // Check for recent campaign generation activity
    console.log('\n\n📈 Recent voice campaign generation activity (last 24 hours):\n');
    const recentActivityQuery = `
      SELECT 
        vm."campaignId",
        c.name as campaign_name,
        vt.name as template_name,
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE vm.status = 'GENERATING') as generating,
        COUNT(*) FILTER (WHERE vm.status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE vm.status = 'QUEUED') as queued,
        COUNT(*) FILTER (WHERE vm.status = 'SENT') as sent,
        COUNT(*) FILTER (WHERE vm.status = 'FAILED') as failed,
        MIN(vm."createdAt") as first_created,
        MAX(vm."updatedAt") as last_updated
      FROM voice_messages vm
      LEFT JOIN campaigns c ON c.id = vm."campaignId"
      LEFT JOIN voice_templates vt ON vt.id = vm."voiceTemplateId"
      WHERE vm."createdAt" > NOW() - INTERVAL '24 hours'
      GROUP BY vm."campaignId", c.name, vt.name
      ORDER BY MAX(vm."updatedAt") DESC
      LIMIT 10;
    `;

    const recentResult = await client.query(recentActivityQuery);
    
    if (recentResult.rows.length === 0) {
      console.log('ℹ️  No recent voice campaign activity in the last 24 hours\n');
    } else {
      recentResult.rows.forEach((row, idx) => {
        console.log(`Campaign ${idx + 1}:`);
        console.log(`   Campaign: ${row.campaign_name || 'Unknown'} (${row.campaignId?.substring(0, 8)}...)`);
        console.log(`   Template: ${row.template_name || 'Unknown'}`);
        console.log(`   Total Messages: ${row.total_messages}`);
        console.log(`   Status: GENERATING=${row.generating}, PENDING=${row.pending}, QUEUED=${row.queued}, COMPLETED=${row.completed}, FAILED=${row.failed}`);
        console.log(`   First Created: ${row.first_created}`);
        console.log(`   Last Updated: ${row.last_updated}`);
        console.log('');
      });
    }

    // Check for generated audio files being created recently
    console.log('\n\n🎵 Recent audio generation activity (last hour):\n');
    const audioActivityQuery = `
      SELECT 
        COUNT(*) as total_generated,
        COUNT(DISTINCT "voiceTemplateId") as unique_templates,
        COUNT(DISTINCT "tenantId") as unique_tenants,
        MIN("createdAt") as first_generated,
        MAX("createdAt") as last_generated
      FROM generated_audio
      WHERE "createdAt" > NOW() - INTERVAL '1 hour';
    `;

    const audioResult = await client.query(audioActivityQuery);
    const audioStats = audioResult.rows[0];
    
    if (audioStats.total_generated > 0) {
      console.log(`   Total Audio Files Generated: ${audioStats.total_generated}`);
      console.log(`   Unique Templates: ${audioStats.unique_templates}`);
      console.log(`   Unique Tenants: ${audioStats.unique_tenants}`);
      console.log(`   First Generated: ${audioStats.first_generated}`);
      console.log(`   Last Generated: ${audioStats.last_generated}`);
      console.log(`   Average Rate: ${Math.round(audioStats.total_generated / 60)} files/minute`);
    } else {
      console.log('ℹ️  No audio generation in the last hour');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkActiveVoiceCampaigns();

