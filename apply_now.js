/**
 * Final attempt to create tables using every possible connection method
 */
require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

const sql = fs.readFileSync(path.join(__dirname, 'supabase_schema.sql'), 'utf8');
const ref = 'rtjiieqkdljlunackbal';
const pw = 'bW19CvJzGSMk5HRi';

async function tryConnect(connStr, label) {
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 6000,
  });
  try {
    process.stdout.write(`  ${label}... `);
    await client.connect();
    console.log('CONNECTED!');
    await client.query(sql);
    console.log('  ✅ Schema applied!');
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log('  Tables:', res.rows.map(r => r.table_name).join(', '));
    await client.end();
    return true;
  } catch (e) {
    console.log(e.message.substring(0, 70));
    try { await client.end(); } catch (_) {}
    return false;
  }
}

async function main() {
  console.log('=== Attempting all connection methods ===\n');

  // 1. Resolve the API hostname IP and try connecting to postgres on that IP
  console.log('1. Resolving API hostname...');
  try {
    const addresses = await dns.resolve4(`${ref}.supabase.co`);
    console.log(`   IP addresses: ${addresses.join(', ')}`);
    for (const ip of addresses) {
      if (await tryConnect(`postgresql://postgres:${pw}@${ip}:5432/postgres`, `direct IP ${ip}:5432`)) return;
      if (await tryConnect(`postgresql://postgres:${pw}@${ip}:6543/postgres`, `direct IP ${ip}:6543`)) return;
    }
  } catch (e) {
    console.log(`   DNS resolve failed: ${e.message}`);
  }

  // 2. Try different hostname patterns
  console.log('\n2. Trying hostname patterns...');
  const hostPatterns = [
    `db.${ref}.supabase.co`,
    `db-${ref}.supabase.co`,
    `${ref}.db.supabase.co`,
    `db.${ref}.supabase.com`,
    `${ref}.supabase.co`,
  ];
  for (const host of hostPatterns) {
    if (await tryConnect(`postgresql://postgres:${pw}@${host}:5432/postgres`, host)) return;
  }

  // 3. Try pooler with URL-encoded password
  console.log('\n3. Trying pooler with different user formats...');
  const regions = ['us-east-1', 'ap-south-1', 'us-west-1', 'eu-west-1', 'ap-southeast-1'];
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    // Try with just 'postgres' user (no project ref)
    if (await tryConnect(`postgresql://postgres:${pw}@${host}:6543/postgres`, `pooler ${region} (postgres)`)) return;
    if (await tryConnect(`postgresql://postgres:${pw}@${host}:5432/postgres`, `session ${region} (postgres)`)) return;
  }

  // 4. Try supabase CLI
  console.log('\n4. Trying Supabase CLI...');
  const { execSync } = require('child_process');
  for (const region of regions) {
    const dbUrl = `postgresql://postgres.${ref}:${pw}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    try {
      const result = execSync(`npx supabase db query --db-url "${dbUrl}" -f supabase_schema.sql`, {
        timeout: 15000,
        encoding: 'utf8',
        cwd: __dirname,
      });
      console.log('  CLI result:', result);
      if (!result.includes('error')) {
        console.log('  ✅ Schema applied via CLI!');
        return;
      }
    } catch (e) {
      console.log(`  CLI ${region}: ${(e.stderr || e.message || '').substring(0, 60)}`);
    }
  }

  console.log('\n❌ All methods failed.');
  console.log('\nPlease create tables manually:');
  console.log(`  https://supabase.com/dashboard/project/${ref}/sql/new`);
}

main().catch(console.error);
