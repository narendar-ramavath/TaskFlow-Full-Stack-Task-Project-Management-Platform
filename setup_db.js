/**
 * setup_db.js — Connect directly to Supabase PostgreSQL and create missing tables
 * 
 * Uses the Supabase connection pooler (port 6543) with the service role key as password.
 * Falls back to port 5432 if pooler doesn't work.
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

// Extract project ref from URL
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

// Supabase PostgreSQL connection string
// Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
// The password for the service role connection is the database password set in the Supabase dashboard

const SQL = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');

async function tryConnect(connectionString, label) {
  console.log(`Trying ${label}...`);
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
  try {
    await client.connect();
    console.log(`  ✅ Connected via ${label}`);
    
    // Execute the schema SQL
    console.log('  Executing schema SQL...');
    await client.query(SQL);
    console.log('  ✅ Schema applied successfully!');
    
    // Verify tables
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('users', 'projects', 'tasks')
      ORDER BY table_name;
    `);
    console.log('  Tables found:', result.rows.map(r => r.table_name).join(', '));
    
    await client.end();
    return true;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message}`);
    try { await client.end(); } catch (e) {}
    return false;
  }
}

async function main() {
  console.log(`Project ref: ${projectRef}`);
  console.log('');
  
  // Common Supabase regions
  const regions = ['us-east-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1', 'us-east-2', 'eu-central-1'];
  
  // Try direct connection with the database password = supabase key
  // Note: This usually requires the actual DB password, not the anon/service key
  
  // Try connection pooler (Transaction mode - port 6543)
  for (const region of regions) {
    const poolerUrl = `postgresql://postgres.${projectRef}:${SUPABASE_KEY}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const success = await tryConnect(poolerUrl, `pooler (${region})`);
    if (success) return;
  }

  // Try direct connection (port 5432)
  for (const region of regions) {
    const directUrl = `postgresql://postgres:${SUPABASE_KEY}@db.${projectRef}.supabase.co:5432/postgres`;
    const success = await tryConnect(directUrl, `direct (${region})`);
    if (success) return;
    break; // Direct connection URL is the same regardless of region
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Could not connect directly to PostgreSQL.');
  console.log('  The SUPABASE_ANON_KEY is not the database password.');
  console.log('');
  console.log('  Please create tables manually:');
  console.log(`  1. Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  console.log('  2. Paste the contents of supabase_schema.sql');
  console.log('  3. Click "Run"');
  console.log('  4. Then run: node create_tables.js (to verify)');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(console.error);
