import supabase from './db-client.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

async function requireAuth(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return null;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Session expired. Please log in again.' });
    return null;
  }
  return data.user;
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  const user = await requireAuth(req, res);
  if (!user) return;

  try {
    if (req.method === 'GET') {
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (!profile) {
        const fallbackName = user.user_metadata?.full_name || String(user.email || '').split('@')[0] || 'Librarian';
        const { data: created, error } = await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: fallbackName,
          role: 'admin',
        }).select().single();
        if (error) throw error;
        profile = created;
      }
      return res.status(200).json(profile);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const fullName = String(body.full_name || '').trim();
      const phone = String(body.phone || '').trim();
      if (!fullName) return res.status(400).json({ error: 'Full name is required.' });
      const { data, error } = await supabase.from('profiles').update({
        full_name: fullName,
        phone: phone || null,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('profile API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
