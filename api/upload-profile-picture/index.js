import { createClient } from '@supabase/supabase-js';
import formidable from 'formidable';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Check if this is a dummy request
  if (req.query.dummy === 'true') {
    return res.status(200).json({ success: true });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the file
    const fileData = fs.readFileSync(file.filepath);

    // Generate a unique file name
    const fileName = `profile-${Date.now()}.${file.originalFilename.split('.').pop()}`;
    const filePath = `avatars/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, fileData, {
        contentType: file.mimetype,
        upsert: true
      });

    // Clean up the temporary file
    fs.unlinkSync(file.filepath);

    if (error) {
      console.error('Upload error:', error);
      return res.status(400).json({ error: error.message });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath);

    return res.status(200).json({ 
      url: publicUrl,
      filePath: filePath
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 