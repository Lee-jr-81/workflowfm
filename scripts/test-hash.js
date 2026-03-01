const bcrypt = require('bcryptjs');

const code = '123456';
const hash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

console.log('Testing bcrypt hash...');
console.log('Code:', code);
console.log('Hash:', hash);

bcrypt.compare(code, hash).then(result => {
  console.log('Match result:', result);
  if (result) {
    console.log('✅ Hash is valid for code "123456"');
  } else {
    console.log('❌ Hash does NOT match code "123456"');
    console.log('\nGenerating new hash...');
    return bcrypt.hash(code, 10);
  }
}).then(newHash => {
  if (newHash) {
    console.log('New hash for "123456":', newHash);
  }
}).catch(err => {
  console.error('Error:', err);
});
