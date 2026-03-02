import bcrypt from 'bcryptjs';

const code = process.argv[2] || '987654';

console.log('Generating bcrypt hash for PIN:', code);
console.log('');

async function generateHash() {
  const hash = await bcrypt.hash(code, 10);
  
  console.log('Hash:', hash);
  console.log('');
  console.log('SQL to update org_staff_access:');
  console.log('');
  console.log(`UPDATE org_staff_access`);
  console.log(`SET access_code_hash = '${hash}',`);
  console.log(`    rotated_at = now()`);
  console.log(`WHERE org_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';`);
  console.log('');
  
  const isValid = await bcrypt.compare(code, hash);
  console.log('Verification test:', isValid ? '✅ PASS' : '❌ FAIL');
}

generateHash().catch(console.error);
