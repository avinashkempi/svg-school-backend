const axios = require('axios');
const { performance } = require('perf_hooks');

const BASE_URL = 'http://localhost:10000/api';

async function testApi() {
  try {
    console.log('🚀 Starting API Performance Test...');

    // Test 1: Get Events with Pagination
    console.log('\n--- Test 1: Get Events (Page 1, Limit 10) ---');
    const start1 = performance.now();
    const res1 = await axios.get(`${BASE_URL}/events?page=1&limit=10`);
    const end1 = performance.now();
    console.log(`Status: ${res1.status}`);
    console.log(`Time: ${(end1 - start1).toFixed(2)}ms`);
    console.log(`Events Count: ${res1.data.event.length}`);
    console.log(`Pagination:`, res1.data.pagination);

    // Test 2: Get Events with Date Filter (Mocking a range)
    console.log('\n--- Test 2: Get Events (Date Filter) ---');
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const start2 = performance.now();
    const res2 = await axios.get(`${BASE_URL}/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
    const end2 = performance.now();
    console.log(`Status: ${res2.status}`);
    console.log(`Time: ${(end2 - start2).toFixed(2)}ms`);
    console.log(`Events Count: ${res2.data.event.length}`);

    // Test 3: Get Users with Pagination (Admin check skipped for simplicity, expecting 401 or 500 if not auth, but let's see public endpoints or just check response)
    // Note: /users endpoints might be protected. If so, we might get 401.
    console.log('\n--- Test 3: Get Users (Pagination) ---');
    try {
        const start3 = performance.now();
        const res3 = await axios.get(`${BASE_URL}/users?page=1&limit=5`);
        const end3 = performance.now();
        console.log(`Status: ${res3.status}`);
        console.log(`Time: ${(end3 - start3).toFixed(2)}ms`);
        console.log(`Users Count: ${res3.data.data.length}`);
        console.log(`Pagination:`, res3.data.pagination);
    } catch (e) {
        console.log(`Expected error (likely auth): ${e.response ? e.response.status : e.message}`);
    }

    console.log('\n✅ Test Completed');
  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    if (error.response) {
        console.error('Response Data:', error.response.data);
    }
  }
}

testApi();
