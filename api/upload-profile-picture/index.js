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
    const { userId, file } = req.body;

    if (!userId || !file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(file.split(',')[1], 'base64');
    const fileName = `profile-${Date.now()}.jpg`;
    const filePath = `${userId}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    // Update user profile with the new image URL
    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 