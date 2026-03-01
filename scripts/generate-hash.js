const bcrypt = require('bcryptjs');

const code = process.argv[2] || '987654';

console.log('Generating bcrypt hash for PIN:', code);
console.log('');

bcrypt.hash(code, 10).then(hash => {
  console.log('Hash:', hash);
  console.log('');
  console.log('SQL to update org_staff_access:');
  console.log('');
  console.log(`UPDATE org_staff_access`);
  console.log(`SET access_code_hash = '${hash}',`);
  console.log(`    rotated_at = now()`);
  console.log(`WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';`);
  console.log('');
  
  // Verify it works
  return bcrypt.compare(code, hash);
}).then(isValid => {
  console.log('Verification test:', isValid ? '✅ PASS' : '❌ FAIL');
}).catch(err => {
  console.error('Error:', err);
});
