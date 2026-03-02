import bcrypt from 'bcryptjs';

const code = '123456';
const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

console.log('Testing bcrypt hash...');
console.log('Code:', code);
console.log('Hash:', hash);

async function testHash() {
  const result = await bcrypt.compare(code, hash);
  
  console.log('Match result:', result);
  
  if (result) {
    console.log('✅ Hash is valid for code "123456"');
  } else {
    console.log('❌ Hash does NOT match code "123456"');
    console.log('\nGenerating new hash...');
    
    const newHash = await bcrypt.hash(code, 10);
    console.log('New hash for "123456":', newHash);
  }
}

testHash().catch(console.error);
