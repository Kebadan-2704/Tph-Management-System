require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkData() {
  const { data: family } = await supabase.from('families').select('*').eq('membership_id', 'TPH-MDK-00002').single();
  console.log('Family:', family);

  if (family) {
    const { data: members } = await supabase.from('members').select('*').eq('family_id', family.id);
    console.log('Members:', members);
  }
}

checkData();
