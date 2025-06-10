// Simple test to debug rate limiting
const BASE_URL = 'http://localhost:3010';

async function debugRateLimit() {
  console.log('🔍 DEBUGGING RATE LIMITING\n');
  
  // Test with same data to trigger rate limiting
  const testData = {
    username: 'ratelimittest',
    email: 'ratelimit@test.com',
    password: 'SecurePass123!@#'
  };

  console.log('Making 6 identical requests rapidly...\n');

  for (let i = 1; i <= 6; i++) {
    try {
      const startTime = Date.now();
      
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData) // Same data each time
      });

      const responseTime = Date.now() - startTime;
      const data = await response.text();
      
      console.log(`Request ${i}:`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response Time: ${responseTime}ms`);
      
      // Log all headers to see if rate limit headers are present
      console.log('   Headers:');
      for (const [key, value] of response.headers.entries()) {
        if (key.toLowerCase().includes('rate') || key.toLowerCase().includes('retry')) {
          console.log(`     ${key}: ${value}`);
        }
      }
      
      if (response.status === 429) {
        console.log('   ✅ RATE LIMITED!');
        console.log(`   Response: ${data}`);
      } else if (response.status === 409) {
        console.log('   ⚠️  User exists (expected after first request)');
      } else if (response.status === 201) {
        console.log('   ✅ User created');
      } else {
        console.log(`   Response: ${data.substring(0, 200)}...`);
      }
      
      console.log('');
      
      // No delay - rapid fire to trigger rate limiting
      
    } catch (error) {
      console.log(`Request ${i}: ❌ Error - ${error.message}\n`);
    }
  }
}

debugRateLimit().catch(console.error); 