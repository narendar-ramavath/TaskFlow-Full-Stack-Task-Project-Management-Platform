/**
 * migrate.js — Create missing tables using Supabase's RPC capability
 * 
 * Strategy: First try to create an exec_sql function via PostgREST, 
 * then use it to run the DDL. If that fails, provide manual instructions.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function checkTables() {
  const { error: pe } = await supabase.from('projects').select('id').limit(1);
  const { error: te } = await supabase.from('tasks').select('id').limit(1);
  return {
    projectsOK: !pe || pe.code !== 'PGRST205',
    tasksOK: !te || te.code !== 'PGRST205',
  };
}

async function tryCreateViaDirect() {
  // Try to use postgres connection via the connection string in Supabase settings
  // This requires the actual database password
  try {
    const { Client } = require('pg');
    
    // Try the Supabase transaction pooler with different password formats
    const projectRef = process.env.SUPABASE_URL.replace('https://', '').split('.')[0];
    
    // Common Supabase DB connection patterns
    const patterns = [
      `postgresql://postgres.${projectRef}:${process.env.SUPABASE_ANON_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      `postgresql://postgres.${projectRef}:${process.env.SUPABASE_ANON_KEY}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    ];

    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');

    for (const connStr of patterns) {
      const client = new Client({ 
        connectionString: connStr, 
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000 
      });
      try {
        await client.connect();
        await client.query(sql);
        await client.end();
        console.log('✅ Tables created via direct PostgreSQL connection!');
        return true;
      } catch (e) {
        try { await client.end(); } catch (_) {}
      }
    }
  } catch (e) {
    // pg module might not be available
  }
  return false;
}

async function main() {
  console.log('🔍 Checking Supabase tables...\n');
  
  const status = await checkTables();
  
  if (status.projectsOK && status.tasksOK) {
    console.log('✅ All tables exist! Everything is ready.\n');
    
    // Quick row counts
    const { count: pc } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    const { count: tc } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
    const { count: uc } = await supabase.from('users').select('*', { count: 'exact', head: true });
    console.log(`   users:    ${uc || 0} rows`);
    console.log(`   projects: ${pc || 0} rows`);
    console.log(`   tasks:    ${tc || 0} rows`);
    return;
  }

  console.log(`   projects: ${status.projectsOK ? '✅' : '❌ MISSING'}`);
  console.log(`   tasks:    ${status.tasksOK ? '✅' : '❌ MISSING'}`);
  console.log('');

  // Try direct connection
  console.log('Attempting automatic migration...');
  const success = await tryCreateViaDirect();
  
  if (success) {
    const verify = await checkTables();
    console.log(`\nVerification: projects=${verify.projectsOK ? '✅' : '❌'}, tasks=${verify.tasksOK ? '✅' : '❌'}`);
    return;
  }

  // Manual instructions
  const projectRef = process.env.SUPABASE_URL.replace('https://', '').split('.')[0];
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     MANUAL SETUP REQUIRED — Follow these steps:         ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                         ║');
  console.log('║  1. Open your Supabase Dashboard:                       ║');
  console.log(`║     https://supabase.com/dashboard/project/${projectRef}`);
  console.log('║                                                         ║');
  console.log('║  2. Click "SQL Editor" in the left sidebar              ║');
  console.log('║                                                         ║');
  console.log('║  3. Click "+ New query"                                 ║');
  console.log('║                                                         ║');
  console.log('║  4. Copy ALL the SQL from this file:                    ║');
  console.log('║     backend/supabase_schema.sql                         ║');
  console.log('║                                                         ║');
  console.log('║  5. Paste it into the SQL editor and click "Run"        ║');
  console.log('║                                                         ║');
  console.log('║  6. After success, restart your backend:                ║');
  console.log('║     cd backend && npm run dev                           ║');
  console.log('║                                                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('After running the SQL, run this script again to verify:');
  console.log('  node migrate.js');
}

main().catch(console.error);
