import supabase from './db-client.js';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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
      const { data: categories, error } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (error) throw error;
      const { data: books } = await supabase.from('books').select('id, category_id');
      const countMap = {};
      (books || []).forEach((b) => {
        if (b.category_id) countMap[b.category_id] = (countMap[b.category_id] || 0) + 1;
      });
      const result = (categories || []).map((c) => ({ ...c, books_count: countMap[c.id] || 0 }));
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const name = String((req.body || {}).name || '').trim();
      const description = String((req.body || {}).description || '').trim();
      if (!name) return res.status(400).json({ error: 'Category name is required.' });
      const { data: all } = await supabase.from('categories').select('id, name');
      if ((all || []).some((c) => String(c.name).toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: 'A category with this name already exists.' });
      }
      const { data, error } = await supabase.from('categories').insert({ name, description: description || null }).select().single();
      if (error) throw error;
      return res.status(201).json({ ...data, books_count: 0 });
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = Number(body.id);
      const name = String(body.name || '').trim();
      if (!id) return res.status(400).json({ error: 'Category id is required.' });
      if (!name) return res.status(400).json({ error: 'Category name is required.' });
      const { data: all } = await supabase.from('categories').select('id, name');
      if ((all || []).some((c) => c.id !== id && String(c.name).toLowerCase() === name.toLowerCase())) {
        return res.status(400).json({ error: 'A category with this name already exists.' });
      }
      const { data, error } = await supabase.from('categories').update({
        name,
        description: body.description === undefined ? undefined : (String(body.description || '').trim() || null),
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const id = Number((req.body || {}).id);
      if (!id) return res.status(400).json({ error: 'Category id is required.' });
      const { count } = await supabase.from('books').select('id', { count: 'exact', head: true }).eq('category_id', id);
      if (count && count > 0) return res.status(400).json({ error: 'Cannot delete: books belong to this category. Reassign them first.' });
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('categories API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
