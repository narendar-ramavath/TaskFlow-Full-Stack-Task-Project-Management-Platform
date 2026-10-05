require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabase = require('./config/supabase');

const seedAdmin = async () => {
  try {
    console.log('Connecting to Supabase...');

    // Check if admin exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@taskflow.com')
      .single();

    if (existingAdmin) {
      console.log('Admin user already exists');
      console.log('Email: admin@taskflow.com');
      console.log('Password: admin123');
      process.exit(0);
    }

    // Hash password for admin
    const hashedPassword = await bcrypt.hash('admin123', 12);

    // Create admin user
    const { data: admin, error: insertError } = await supabase
      .from('users')
      .insert([{
        name: 'Admin User',
        email: 'admin@taskflow.com',
        password: hashedPassword,
        role: 'admin',
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (insertError) {
      console.error('Error creating admin:', insertError);
      process.exit(1);
    }

    console.log('Admin user created successfully!');
    console.log('Email: admin@taskflow.com');
    console.log('Password: admin123');
    console.log('Role: admin');

    // Check if member exists
    const { data: existingMember } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'member@taskflow.com')
      .single();

    if (!existingMember) {
      const hashedMemberPassword = await bcrypt.hash('member123', 12);

      await supabase
        .from('users')
        .insert([{
          name: 'Member User',
          email: 'member@taskflow.com',
          password: hashedMemberPassword,
          role: 'member',
          created_at: new Date().toISOString()
        }]);

      console.log('\nMember user created successfully!');
      console.log('Email: member@taskflow.com');
      console.log('Password: member123');
      console.log('Role: member');
    }

    console.log('\nSupabase seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedAdmin();
