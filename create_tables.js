/**
 * create_tables.js — Create missing tables in Supabase using the SQL API
 */
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

const PROJECTS_SQL = `CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  members UUID[] DEFAULT '{}',
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

const TASKS_SQL = `CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'review', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

const INDEXES_SQL = `
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
`;

const RLS_SQL = `
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
`;

const GRANTS_SQL = `
GRANT ALL ON projects TO anon, authenticated;
GRANT ALL ON tasks TO anon, authenticated;
`;

async function executeSQL(sql, label) {
  console.log(`  → ${label}...`);
  
  // Try the Supabase SQL query endpoint (works with service_role key)
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  // The REST API doesn't support raw SQL. 
  // We need to use the Supabase Management API or Dashboard SQL Editor.
  return resp.status;
}

async function main() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Check current state
  const { error: pe } = await supabase.from('projects').select('id').limit(1);
  const { error: te } = await supabase.from('tasks').select('id').limit(1);
  
  if (!pe && !te) {
    console.log('✅ Both tables already exist! Everything is set up.');
    
    // Quick count
    const { count: pc } = await supabase.from('projects').select('*', { count: 'exact', head: true });
    const { count: tc } = await supabase.from('tasks').select('*', { count: 'exact', head: true });
    console.log(`   projects: ${pc || 0} rows`);
    console.log(`   tasks: ${tc || 0} rows`);
    return;
  }

  // Tables are missing — try to create them via the Management API
  console.log('Tables missing. Attempting to create via Management API...');
  
  // Extract project ref from URL (e.g., rtjiieqkdljlunackbal from https://rtjiieqkdljlunackbal.supabase.co)
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  
  const fullSQL = [PROJECTS_SQL, TASKS_SQL, INDEXES_SQL, RLS_SQL, GRANTS_SQL].join('\n');
  
  // Try the Management API SQL endpoint
  const mgmtResp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: fullSQL }),
  });
  
  if (mgmtResp.ok) {
    console.log('✅ Tables created successfully!');
    return;
  }

  // If management API didn't work, print SQL for manual execution
  console.log(`\nManagement API returned ${mgmtResp.status}. Manual setup required.`);
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Please run this SQL in your Supabase Dashboard SQL Editor:');
  console.log('══════════════════════════════════════════════════════════════\n');
  console.log('Go to: https://supabase.com/dashboard/project/' + projectRef + '/sql/new\n');
  console.log(fullSQL);
  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('After running the SQL, restart your backend server.');
}

main().catch(console.error);
