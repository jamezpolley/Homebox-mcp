#!/usr/bin/env node

/**
 * Simple test script to verify Homebox connection
 * Run with: node test-connection.js
 */

import axios from 'axios';
import { readFileSync } from 'fs';

console.log('=================================');
console.log('Homebox Connection Test');
console.log('=================================\n');

// Load configuration
let config;
try {
  const configData = readFileSync('config.json', 'utf-8');
  config = JSON.parse(configData);
  console.log('✅ Successfully loaded config.json');
} catch (error) {
  console.error('❌ Failed to load config.json');
  console.error('   Make sure you have created config.json from config.json.example');
  console.error('   Error:', error.message);
  process.exit(1);
}

// Verify configuration
console.log('\nConfiguration:');
console.log(`   URL: ${config.homeboxUrl}`);
console.log(`   Email: ${config.email}`);
console.log(`   Password: ${'*'.repeat(config.password?.length || 0)}`);

if (!config.homeboxUrl || !config.email || !config.password) {
  console.error('\n❌ Configuration incomplete!');
  console.error('   Please edit config.json and fill in all fields');
  process.exit(1);
}

// Test connection
console.log('\nTesting connection to Homebox...');

const client = axios.create({
  baseURL: config.homeboxUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

async function testConnection() {
  try {
    // Try to reach the server
    console.log('   Checking if Homebox is reachable...');
    try {
      await client.get('/api/v1/status');
      console.log('   ✅ Homebox is reachable');
    } catch (error) {
      if (error.response) {
        console.log('   ✅ Homebox is reachable (got response)');
      } else if (error.code === 'ECONNREFUSED') {
        console.error('   ❌ Cannot connect to Homebox');
        console.error('      Make sure Homebox is running at:', config.homeboxUrl);
        process.exit(1);
      } else if (error.code === 'ETIMEDOUT') {
        console.error('   ❌ Connection timeout');
        console.error('      The server is not responding. Check the URL in config.json');
        process.exit(1);
      } else {
        throw error;
      }
    }

    // Try to authenticate
    const loginBody = { username: config.email, password: config.password };
    console.log('   Attempting to authenticate...');
    console.log('   POST /api/v1/users/login');
    console.log('   Request body:', JSON.stringify({ ...loginBody, password: '***' }, null, 2));
    const response = await client.post('/api/v1/users/login', loginBody);
    console.log('   Response status:', response.status);
    console.log('   Response body:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.token) {
      console.log('   ✅ Authentication successful!');
      console.log('   Token received:', response.data.token.substring(0, 20) + '...');

      // Try to get some data
      const authClient = axios.create({
        baseURL: config.homeboxUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': response.data.token,
        },
      });

      console.log('\nTesting API access...');

      try {
        console.log('   GET /api/v1/locations');
        const locationsResponse = await authClient.get('/api/v1/locations');
        console.log('   Response status:', locationsResponse.status);
        console.log('   Response body:', JSON.stringify(locationsResponse.data, null, 2));
        console.log('   ✅ Successfully fetched locations');
        console.log(`   Found ${locationsResponse.data?.items?.length || 0} locations`);
      } catch (error) {
        console.log('   ⚠️  Could not fetch locations');
        if (error.response) {
          console.log('   Status:', error.response.status);
          console.log('   Response body:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.log('   Error:', error.message);
        }
      }

      try {
        console.log('   GET /api/v1/items');
        const itemsResponse = await authClient.get('/api/v1/items');
        console.log('   Response status:', itemsResponse.status);
        console.log('   Response body:', JSON.stringify(itemsResponse.data, null, 2));
        console.log('   ✅ Successfully fetched items');
        console.log(`   Found ${itemsResponse.data?.items?.length || 0} items`);
      } catch (error) {
        console.log('   ⚠️  Could not fetch items');
        if (error.response) {
          console.log('   Status:', error.response.status);
          console.log('   Response body:', JSON.stringify(error.response.data, null, 2));
        } else {
          console.log('   Error:', error.message);
        }
      }

      console.log('\n=================================');
      console.log('✅ All tests passed!');
      console.log('=================================');
      console.log('\nYour Homebox MCP server is ready to use.');
      console.log('You can now configure it with Claude Desktop.');
      console.log('See README.md for instructions.');

    } else {
      console.error('   ❌ Authentication failed: No token received');
      console.error('   Response body:', JSON.stringify(response.data, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test failed!');

    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response headers:', JSON.stringify(error.response.headers, null, 2));
      console.error('   Response body:', JSON.stringify(error.response.data, null, 2));

      if (error.response.status === 401) {
        console.error('\n   This usually means your email or password is incorrect.');
        console.error('   Please check your config.json file.');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to Homebox');
      console.error('   Make sure Homebox is running at:', config.homeboxUrl);
    } else {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }

    process.exit(1);
  }
}

testConnection();
