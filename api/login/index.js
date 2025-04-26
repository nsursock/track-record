import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, rememberMe } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'Email and password are required'
      });
    }

    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        // Set the session duration based on remember me
        persistSession: rememberMe
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      
      // Handle specific error cases
      if (authError.message.includes('Invalid login credentials')) {
        return res.status(401).json({ 
          error: 'Invalid credentials',
          details: 'The email or password you entered is incorrect'
        });
      }

      return res.status(400).json({ 
        error: 'Authentication failed',
        details: authError.message
      });
    }

    // Get the user's profile from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('User profile error:', userError);
      return res.status(500).json({ 
        error: 'Failed to fetch user profile',
        details: userError.message
      });
    }

    // Return the session and user data
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      session: authData.session,
      user: {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        profile_picture_url: userData.profile_picture_url
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
} 