// Test script to check LM Studio integration
const baseURL = 'http://localhost:4096';

async function testLMStudio() {
  console.log('🔍 Testing LM Studio integration...\n');

  // 1. Check current provider
  console.log('1️⃣ Checking current provider...');
  try {
    const res = await fetch(`${baseURL}/api/models/provider`);
    const data = await res.json();
    console.log('   Current provider:', data.provider);
  } catch (e) {
    console.error('   ❌ Error:', e.message);
  }

  // 2. Set provider to LM Studio
  console.log('\n2️⃣ Setting provider to LM Studio...');
  try {
    const res = await fetch(`${baseURL}/api/models/provider`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: 'lmstudio' }),
    });
    const data = await res.json();
    console.log('   ✅ Provider set to:', data.provider);
  } catch (e) {
    console.error('   ❌ Error:', e.message);
  }

  // 3. Check provider status
  console.log('\n3️⃣ Checking provider status...');
  try {
    const res = await fetch(`${baseURL}/api/models/provider/status`);
    const data = await res.json();
    console.log('   Provider:', data.provider);
    console.log('   Running:', data.running);
    console.log('   URL:', data.url);
    if (data.error) {
      console.log('   ⚠️  Error:', data.error);
    }
  } catch (e) {
    console.error('   ❌ Error:', e.message);
  }

  // 4. List models
  console.log('\n4️⃣ Listing models...');
  try {
    const res = await fetch(`${baseURL}/api/models`);
    const data = await res.json();
    if (data.error) {
      console.error('   ❌ Error:', data.error);
    } else {
      console.log('   Provider:', data.provider);
      console.log('   Models found:', data.models.length);
      data.models.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.name}`);
      });
    }
  } catch (e) {
    console.error('   ❌ Error:', e.message);
  }

  // 5. Check LM Studio directly
  console.log('\n5️⃣ Checking LM Studio server directly...');
  try {
    const res = await fetch('http://localhost:1234/v1/models');
    if (res.ok) {
      const data = await res.json();
      console.log('   ✅ LM Studio is running');
      console.log('   Models:', data.data.length);
      data.data.forEach((m, i) => {
        console.log(`   ${i + 1}. ${m.id}`);
      });
    } else {
      console.log('   ❌ LM Studio returned error:', res.status);
    }
  } catch (e) {
    console.error('   ❌ LM Studio not running or not accessible');
    console.error('   Error:', e.message);
  }

  console.log('\n✅ Test complete!');
}

testLMStudio();
