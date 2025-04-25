import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
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
      websiteUrl
    } = req.body;

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Set to false if you want to implement email verification
    });

    if (authError) {
      console.error('Auth error:', authError);
      return res.status(400).json({ error: authError.message });
    }

    const userId = authData.user.id;

    // 2. Create the user profile in the users table
    const { error: profileError } = await supabase
      .from('users')
      .update({
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
        website_url: websiteUrl
      })
      .eq('id', userId);

    if (profileError) {
      console.error('Profile error:', profileError);
      return res.status(400).json({ error: profileError.message });
    }

    // 3. Return success response
    return res.status(200).json({
      message: 'User created successfully',
      userId
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 