(require('dotenv').config)({ path: './backend/.env' });
(async function(){
  try{
    // Load env from backend/.env
    const supabase = require('../lib/supabaseClient');
    const { getAdminPool } = require('../tenantManager');

    console.log('Supabase client present:', !!supabase && !!supabase.from);

    const supRes = await supabase.from('businesses').select('id,name').limit(2);
    console.log('Supabase query error:', supRes.error ? (supRes.error.message || supRes.error) : null);
    console.log('Supabase query data length:', supRes.data ? supRes.data.length : 0);
    console.log('Supabase sample:', supRes.data && supRes.data.slice(0,2));

    const pool = getAdminPool();
    const p = await pool.query('SELECT count(*) FROM businesses');
    console.log('Postgres pool count:', p.rows[0]);

    process.exit(0);
  }catch(e){
    console.error('TEST ERROR:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();
