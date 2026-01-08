#!/usr/bin/env node

// Script to test ElevenLabs API key configuration
const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_USERNAME = process.env.DB_USERNAME || 'sms_user';
const DB_PASSWORD = process.env.DB_PASSWORD || 'sms_password';
const DB_DATABASE = process.env.DB_DATABASE || 'sms_platform';

async function testElevenLabsKey() {
  console.log('🔍 Testing ElevenLabs API Key Configuration...\n');
  
  // Get API key from database
  const { Client } = require('pg');
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USERNAME,
    password: DB_PASSWORD,
    database: DB_DATABASE,
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Get API key from system_configs (note: column is camelCase in TypeORM)
    const result = await client.query(
      'SELECT key, value, "isActive" FROM system_configs WHERE key = $1',
      ['ELEVENLABS_API_KEY']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ ELEVENLABS_API_KEY not found in database');
      console.log('   Please set it via Settings → API Keys or run:');
      console.log('   UPDATE system_configs SET value = \'sk_your_key_here\' WHERE key = \'ELEVENLABS_API_KEY\';');
      return;
    }
    
    const config = result.rows[0];
    const apiKey = config.value;
    const isActive = config.isActive;
    
    console.log('📋 Database Configuration:');
    console.log(`   Key: ${config.key}`);
    console.log(`   Value: ${apiKey ? apiKey.substring(0, 20) + '...' : 'NULL'}`);
    console.log(`   Active: ${isActive}`);
    console.log(`   Full Key Length: ${apiKey ? apiKey.length : 0} characters\n`);
    
    if (!apiKey) {
      console.log('❌ API key is NULL or empty in database');
      return;
    }
    
    if (!isActive) {
      console.log('⚠️  API key is marked as inactive');
    }
    
    // Check API key format
    if (!apiKey.startsWith('sk_')) {
      console.log('⚠️  Warning: API key should start with "sk_"');
    }
    
    // Test API key with ElevenLabs
    console.log('🧪 Testing API key with ElevenLabs API...\n');
    
    try {
      // Test 1: Get voices (simple endpoint to test auth)
      console.log('Test 1: Fetching voices...');
      const voicesResponse = await axios.get('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': apiKey,
        },
        timeout: 10000,
      });
      
      console.log(`✅ API key is valid!`);
      console.log(`   Found ${voicesResponse.data.voices?.length || 0} voices\n`);
      
      // Test 2: Get user info (check credits/quota)
      console.log('Test 2: Fetching user info...');
      try {
        const userResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
          headers: {
            'xi-api-key': apiKey,
          },
          timeout: 10000,
        });
        
        console.log(`✅ User info retrieved:`);
        console.log(`   Subscription: ${userResponse.data.subscription?.tier || 'Unknown'}`);
        console.log(`   Character Count: ${userResponse.data.subscription?.character_count || 0}`);
        console.log(`   Character Limit: ${userResponse.data.subscription?.character_limit || 0}`);
        if (userResponse.data.subscription?.character_limit) {
          const remaining = userResponse.data.subscription.character_limit - (userResponse.data.subscription.character_count || 0);
          console.log(`   Remaining: ${remaining} characters`);
        }
        console.log('');
      } catch (userError) {
        console.log(`⚠️  Could not fetch user info: ${userError.response?.data?.detail?.message || userError.message}\n`);
      }
      
      // Test 3: Try generating a small audio sample
      console.log('Test 3: Generating test audio...');
      const testVoiceId = voicesResponse.data.voices?.[0]?.voice_id;
      if (testVoiceId) {
        try {
          const audioResponse = await axios.post(
            `https://api.elevenlabs.io/v1/text-to-speech/${testVoiceId}`,
            {
              text: 'Hello, this is a test.',
              voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
              },
            },
            {
              headers: {
                'xi-api-key': apiKey,
                'Content-Type': 'application/json',
              },
              responseType: 'arraybuffer',
              timeout: 30000,
            }
          );
          
          console.log(`✅ Audio generation successful!`);
          console.log(`   Audio size: ${audioResponse.data.byteLength} bytes`);
          console.log(`   Voice used: ${testVoiceId}\n`);
        } catch (audioError) {
          console.log(`❌ Audio generation failed:`);
          console.log(`   Status: ${audioError.response?.status || 'N/A'}`);
          console.log(`   Error: ${JSON.stringify(audioError.response?.data || { message: audioError.message }, null, 2)}\n`);
        }
      } else {
        console.log('⚠️  No voices available to test audio generation\n');
      }
      
    } catch (error) {
      console.log('❌ API key test failed:\n');
      console.log(`   Status Code: ${error.response?.status || 'N/A'}`);
      console.log(`   Error: ${JSON.stringify(error.response?.data || { message: error.message }, null, 2)}\n`);
      
      if (error.response?.status === 401) {
        console.log('💡 This indicates the API key is invalid or expired.');
        console.log('   Please verify the key at https://elevenlabs.io/app/settings/api-keys\n');
      } else if (error.response?.status === 429) {
        console.log('💡 This indicates rate limiting or quota exceeded.');
        console.log('   Check your ElevenLabs account for remaining credits.\n');
      }
    }
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await client.end();
  }
}

testElevenLabsKey().catch(console.error);

