require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase connection...\n');
console.log('URL:', supabaseUrl);
console.log('Service Role Key:', supabaseServiceRoleKey ? `${supabaseServiceRoleKey.substring(0, 20)}...` : 'MISSING');
console.log('');

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function test() {
  try {
    console.log('1. Testing connection to orgs table...');
    const { data: orgs, error: orgsError } = await supabase
      .from('orgs')
      .select('id, slug, name')
      .limit(5);

    if (orgsError) {
      console.error('❌ Error querying orgs:', orgsError.message);
      return;
    }

    console.log('✅ Connected! Found', orgs.length, 'org(s)');
    orgs.forEach(org => {
      console.log('  -', org.slug, ':', org.name);
    });
    console.log('');

    console.log('2. Testing org_staff_access table...');
    const { data: access, error: accessError } = await supabase
      .from('org_staff_access')
      .select('org_id, is_enabled, access_code_hash')
      .eq('org_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
      .single();

    if (accessError) {
      console.error('❌ Error querying org_staff_access:', accessError.message);
      return;
    }

    console.log('✅ Found access config:');
    console.log('  - Enabled:', access.is_enabled);
    console.log('  - Hash:', access.access_code_hash ? access.access_code_hash.substring(0, 20) + '...' : 'NULL');
    console.log('');

    console.log('3. Testing departments table...');
    const { data: depts, error: deptsError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('org_id', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890')
      .eq('active', true);

    if (deptsError) {
      console.error('❌ Error querying departments:', deptsError.message);
      return;
    }

    console.log('✅ Found', depts.length, 'department(s)');
    depts.forEach(dept => {
      console.log('  -', dept.name);
    });

    console.log('\n✅ All tests passed! Supabase connection is working.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

test();
