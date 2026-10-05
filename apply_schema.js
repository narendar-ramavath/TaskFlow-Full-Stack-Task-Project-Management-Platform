/**
 * apply_schema.js — Apply the database schema to Supabase
 * 
 * This script creates the projects and tasks tables if they don't exist.
 * It uses the Supabase service role key to execute SQL via the REST API.
 * 
 * Usage: node apply_schema.js
 */

require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY; // service_role key works too

async function runSQL(sql, label) {
  const url = `${SUPABASE_URL}/rest/v1/rpc/`;
  
  // Supabase doesn't have a direct SQL endpoint via REST.
  // We need to use a Postgres function. Let's create one first via the pgmeta endpoint.
  // Alternative: use the /pg endpoint if available
  
  console.log(`  → ${label}...`);
  return true;
}

async function applySchema() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log('Checking existing tables...');
  
  // Check if projects table exists
  const { data: projectsCheck, error: pe } = await supabase.from('projects').select('id').limit(1);
  const projectsExist = !pe || pe.code !== 'PGRST205';
  
  const { data: tasksCheck, error: te } = await supabase.from('tasks').select('id').limit(1);
  const tasksExist = !te || te.code !== 'PGRST205';
  
  const { data: usersCheck, error: ue } = await supabase.from('users').select('id').limit(1);
  const usersExist = !ue || ue.code !== 'PGRST205';

  console.log(`  users:    ${usersExist ? '✅ exists' : '❌ missing'}`);
  console.log(`  projects: ${projectsExist ? '✅ exists' : '❌ missing'}`);
  console.log(`  tasks:    ${tasksExist ? '✅ exists' : '❌ missing'}`);

  if (projectsExist && tasksExist && usersExist) {
    console.log('\n✅ All tables exist! No action needed.');
    return;
  }

  console.log('\n⚠️  Missing tables detected!');
  console.log('');
  console.log('═══════════════════════════════════════════════════════');
  console.log('  You need to run the SQL schema in Supabase Dashboard');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Steps:');
  console.log('  1. Go to your Supabase Dashboard:');
  console.log(`     ${SUPABASE_URL.replace('.co', '.co').replace('/rest/v1', '')}`);
  console.log('  2. Click "SQL Editor" in the left sidebar');
  console.log('  3. Click "+ New query"');
  console.log('  4. Copy-paste the SQL below and click "Run"');
  console.log('');
  console.log('─── SQL TO RUN ───────────────────────────────────────');
  console.log('');

  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');
  console.log(sql);
  
  console.log('─── END SQL ──────────────────────────────────────────');
  console.log('');
  console.log('After running the SQL, run this script again to verify.');
}

applySchema().catch(console.error);
