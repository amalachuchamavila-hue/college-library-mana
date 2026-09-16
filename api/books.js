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
      const { search = '', category_id = '', availability = '' } = req.query || {};
      let query = supabase.from('books').select('*').order('created_at', { ascending: false }).order('id', { ascending: false });
      if (category_id) query = query.eq('category_id', Number(category_id));
      const { data: books, error } = await query;
      if (error) throw error;
      const { data: cats } = await supabase.from('categories').select('id, name');
      const catMap = {};
      (cats || []).forEach((c) => { catMap[c.id] = c.name; });
      let result = (books || []).map((b) => ({
        ...b,
        category_name: b.category_id ? catMap[b.category_id] || null : null,
      }));
      const s = String(search).trim().toLowerCase();
      if (s) {
        result = result.filter((b) =>
          [b.title, b.author, b.isbn, b.book_id, b.publisher, b.category_name]
            .map((v) => String(v || '').toLowerCase())
            .some((v) => v.includes(s))
        );
      }
      if (availability === 'available') result = result.filter((b) => Number(b.available_copies) > 0);
      if (availability === 'unavailable') result = result.filter((b) => Number(b.available_copies) <= 0);
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const title = String(body.title || '').trim();
      const author = String(body.author || '').trim();
      const isbn = String(body.isbn || '').trim();
      if (!title || !author || !isbn) return res.status(400).json({ error: 'Book name, author and ISBN are required.' });
      const total = Number(body.total_copies ?? 1);
      if (!Number.isInteger(total) || total < 0) return res.status(400).json({ error: 'Total copies must be a non-negative whole number.' });
      const year = body.published_year === '' || body.published_year == null ? null : Number(body.published_year);
      if (year != null && (!Number.isInteger(year) || year < 1000 || year > 2100)) return res.status(400).json({ error: 'Published year must be a valid year.' });
      const { data: isbnDup } = await supabase.from('books').select('id').eq('isbn', isbn).limit(1);
      if (isbnDup && isbnDup.length) return res.status(400).json({ error: 'A book with this ISBN already exists.' });
      let code = String(body.book_id || '').trim();
      if (code) {
        const { data: codeDup } = await supabase.from('books').select('id').eq('book_id', code).limit(1);
        if (codeDup && codeDup.length) return res.status(400).json({ error: 'This Book ID is already in use.' });
      } else {
        code = 'BK-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
      }
      const categoryId = body.category_id ? Number(body.category_id) : null;
      if (categoryId) {
        const { data: cat } = await supabase.from('categories').select('id').eq('id', categoryId).limit(1);
        if (!cat || !cat.length) return res.status(400).json({ error: 'Selected category does not exist.' });
      }
      const { data, error } = await supabase.from('books').insert({
        book_id: code,
        isbn,
        title,
        author,
        category_id: categoryId,
        publisher: String(body.publisher || '').trim() || null,
        published_year: year,
        total_copies: total,
        available_copies: total,
        description: String(body.description || '').trim() || null,
        shelf_location: String(body.shelf_location || '').trim() || null,
      }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const body = req.body || {};
      const id = Number(body.id);
      if (!id) return res.status(400).json({ error: 'Book id is required.' });
      const { data: current, error: curErr } = await supabase.from('books').select('*').eq('id', id).single();
      if (curErr || !current) return res.status(404).json({ error: 'Book not found.' });
      const title = String(body.title ?? current.title).trim();
      const author = String(body.author ?? current.author).trim();
      const isbn = String(body.isbn ?? current.isbn).trim();
      if (!title || !author || !isbn) return res.status(400).json({ error: 'Book name, author and ISBN are required.' });
      const total = body.total_copies == null || body.total_copies === '' ? current.total_copies : Number(body.total_copies);
      if (!Number.isInteger(total) || total < 0) return res.status(400).json({ error: 'Total copies must be a non-negative whole number.' });
      const { data: isbnDup } = await supabase.from('books').select('id').eq('isbn', isbn).neq('id', id).limit(1);
      if (isbnDup && isbnDup.length) return res.status(400).json({ error: 'A book with this ISBN already exists.' });
      const code = String(body.book_id ?? current.book_id).trim() || current.book_id;
      const { data: codeDup } = await supabase.from('books').select('id').eq('book_id', code).neq('id', id).limit(1);
      if (codeDup && codeDup.length) return res.status(400).json({ error: 'This Book ID is already in use.' });
      const categoryId = body.category_id === undefined ? current.category_id : (body.category_id ? Number(body.category_id) : null);
      if (categoryId) {
        const { data: cat } = await supabase.from('categories').select('id').eq('id', categoryId).limit(1);
        if (!cat || !cat.length) return res.status(400).json({ error: 'Selected category does not exist.' });
      }
      const { count: issuedCount } = await supabase.from('book_issues').select('id', { count: 'exact', head: true }).eq('book_id', id).eq('status', 'issued');
      const issued = issuedCount || 0;
      if (total < issued) return res.status(400).json({ error: 'Total copies cannot be less than ' + issued + ' currently issued.' });
      const year = body.published_year === undefined ? current.published_year : (body.published_year === '' || body.published_year == null ? null : Number(body.published_year));
      if (year != null && (!Number.isInteger(year) || year < 1000 || year > 2100)) return res.status(400).json({ error: 'Published year must be a valid year.' });
      const { data, error } = await supabase.from('books').update({
        book_id: code,
        isbn,
        title,
        author,
        category_id: categoryId,
        publisher: body.publisher === undefined ? current.publisher : (String(body.publisher || '').trim() || null),
        published_year: year,
        total_copies: total,
        available_copies: total - issued,
        description: body.description === undefined ? current.description : (String(body.description || '').trim() || null),
        shelf_location: body.shelf_location === undefined ? current.shelf_location : (String(body.shelf_location || '').trim() || null),
        updated_at: new Date().toISOString(),
      }).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const id = Number((req.body || {}).id);
      if (!id) return res.status(400).json({ error: 'Book id is required.' });
      const { count } = await supabase.from('book_issues').select('id', { count: 'exact', head: true }).eq('book_id', id).eq('status', 'issued');
      if (count && count > 0) return res.status(400).json({ error: 'Cannot delete: copies are currently issued. Return them first.' });
      await supabase.from('book_issues').delete().eq('book_id', id);
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('books API error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
