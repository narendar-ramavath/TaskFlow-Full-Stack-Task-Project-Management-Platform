require('dotenv').config();

const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabase');

const app = express();

// Verify Supabase connection and required tables on startup
const verifySupabase = async () => {
  try {
    // Check users table
    const { error: ue } = await supabase.from('users').select('id').limit(1);
    if (ue) {
      console.error('❌ Users table not found:', ue.message);
      console.error('   Run the SQL from supabase_schema.sql in your Supabase SQL Editor');
      return;
    }
    console.log('✅ users table OK');

    // Check projects table
    const { error: pe } = await supabase.from('projects').select('id').limit(1);
    if (pe && pe.code === 'PGRST205') {
      console.error('');
      console.error('══════════════════════════════════════════════════════════');
      console.error('  ❌ "projects" table is MISSING in Supabase!');
      console.error('');
      console.error('  To fix:');
      console.error('  1. Open your Supabase Dashboard SQL Editor');
      console.error('  2. Paste the contents of backend/supabase_schema.sql');
      console.error('  3. Click "Run"');
      console.error('  4. Restart this server');
      console.error('══════════════════════════════════════════════════════════');
      console.error('');
    } else {
      console.log('✅ projects table OK');
    }

    // Check tasks table
    const { error: te } = await supabase.from('tasks').select('id').limit(1);
    if (te && te.code === 'PGRST205') {
      console.error('  ❌ "tasks" table is MISSING in Supabase!');
    } else {
      console.log('✅ tasks table OK');
    }

    if (!pe && !te) {
      console.log('✅ Supabase connection verified — all tables present');
    }
  } catch (err) {
    console.error('Supabase connection error:', err.message);
  }
};

verifySupabase();

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));

app.get('/api/health', async (req, res) => {
  // Check table existence
  const { error: pe } = await supabase.from('projects').select('id').limit(1);
  const { error: te } = await supabase.from('tasks').select('id').limit(1);
  
  const tablesOK = !pe && !te;
  res.json({
    status: tablesOK ? 'OK' : 'SETUP_REQUIRED',
    message: tablesOK ? 'Server is running' : 'Database tables need to be created. Run supabase_schema.sql in your Supabase SQL Editor.',
    tables: {
      projects: pe ? 'MISSING' : 'OK',
      tasks: te ? 'MISSING' : 'OK',
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
