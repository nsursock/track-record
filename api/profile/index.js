import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Extract the token
    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify the token and get the user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get the user's profile from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (userError) {
      console.error('User profile error:', userError);
      return res.status(500).json({ 
        error: 'Failed to fetch user profile',
        details: userError.message
      });
    }

    // Return the user data
    return res.status(200).json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        first_name: userData.first_name,
        last_name: userData.last_name,
        profile_picture_url: userData.profile_picture_url,
        country: userData.country,
        city: userData.city,
        date_of_birth: userData.date_of_birth,
        phone_number: userData.phone_number,
        gender: userData.gender,
        linkedin_url: userData.linkedin_url,
        twitter_url: userData.twitter_url,
        github_url: userData.github_url,
        website_url: userData.website_url,
        created_at: userData.created_at,
        updated_at: userData.updated_at
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