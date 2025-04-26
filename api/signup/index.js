import { createClient } from '@supabase/supabase-js';

// Log environment variables (without exposing sensitive data)
console.log('Supabase URL exists:', !!process.env.SUPABASE_URL);
console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Initialize Supabase client with error handling
let supabase;
try {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials in environment variables');
  }

  // Validate URL format
  try {
    new URL(supabaseUrl);
  } catch (e) {
    throw new Error('Invalid Supabase URL format. Expected format: https://your-project-id.supabase.co');
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Supabase client:', error.message);
  throw error;
}

export default async function handler(req, res) {
  // Set response headers
  res.setHeader('Content-Type', 'application/json');

  console.log('Signup API called with method:', req.method);
  // Don't log the full request body to avoid exposing sensitive data
  console.log('Request body keys:', Object.keys(req.body));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      email,
      password,
      firstName,
      lastName,
      country,
      city,
      dateOfBirth,
      phoneNumber,
      gender,
      linkedinUrl,
      twitterUrl,
      githubUrl,
      websiteUrl,
      profilePictureUrl
    } = req.body;

    // Validate required fields
    const missingFields = [];
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    if (!firstName) missingFields.push('firstName');
    if (!lastName) missingFields.push('lastName');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          missingFields,
          message: `The following fields are required: ${missingFields.join(', ')}`
        }
      });
    }

    console.log('Attempting to create user with email:', email);

    // Check if user exists in users table first
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking for existing user:', checkError);
      return res.status(500).json({ 
        error: 'Error checking user existence',
        details: checkError.message
      });
    }

    if (existingUser) {
      console.log('User exists in users table:', existingUser.id);
      return res.status(400).json({ 
        error: 'User already exists',
        details: 'A user with this email already exists in the system'
      });
    }

    console.log('No existing user found, proceeding with signup');

    try {
      // 1. Create the user in Supabase Auth with all metadata
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          country,
          city,
          date_of_birth: dateOfBirth,
          phone_number: phoneNumber,
          gender,
          linkedin_url: linkedinUrl,
          twitter_url: twitterUrl,
          github_url: githubUrl,
          website_url: websiteUrl,
          profile_picture_url: profilePictureUrl
        }
      });

      if (authError) {
        console.error('Auth error:', {
          message: authError.message,
          code: authError.code,
          status: authError.status
        });
        
        if (authError.message.includes('User already registered')) {
          return res.status(400).json({ 
            error: 'Email already registered',
            details: 'This email address is already in use'
          });
        }

        return res.status(400).json({ 
          error: 'Failed to create user',
          details: authError.message,
          code: authError.code
        });
      }

      console.log('Auth user created successfully with ID:', authData.user.id);
      const userId = authData.user.id;

      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Update the user profile with any additional information that wasn't set by the trigger
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          country: country || null,
          city: city || null,
          date_of_birth: dateOfBirth || null,
          phone_number: phoneNumber || null,
          gender: gender || null,
          linkedin_url: linkedinUrl || null,
          twitter_url: twitterUrl || null,
          github_url: githubUrl || null,
          website_url: websiteUrl || null,
          profile_picture_url: profilePictureUrl || null
        })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        console.error('Profile update error:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint
        });
        
        // Get current state of the table
        const { data: allUsers, error: usersError } = await supabase
          .from('users')
          .select('id, email, created_at')
          .order('created_at', { ascending: false })
          .limit(5);
        
        console.log('Current users in table:', allUsers);
        
        // Attempt to delete the auth user if profile update fails
        await supabase.auth.admin.deleteUser(userId);
        
        return res.status(400).json({ 
          error: 'Failed to update user profile',
          details: updateError.message
        });
      }

      console.log('User profile updated successfully:', updatedUser);

      return res.status(200).json({ 
        success: true,
        message: 'User created successfully',
        userId,
        user: {
          id: userId,
          email,
          first_name: firstName,
          last_name: lastName,
          profile_picture_url: profilePictureUrl
        }
      });

    } catch (error) {
      console.error('Unexpected error:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        details: error.message
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  }
} 