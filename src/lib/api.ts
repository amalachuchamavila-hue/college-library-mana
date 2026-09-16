import supabase from './supabase';

export interface Category {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  books_count?: number;
}

export interface Book {
  id: number;
  book_id: string;
  isbn: string;
  title: string;
  author: string;
  category_id: number | null;
  category_name?: string | null;
  publisher: string | null;
  published_year: number | null;
  total_copies: number;
  available_copies: number;
  description: string | null;
  shelf_location: string | null;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: number;
  student_id: string;
  name: string;
  email: string;
  phone: string | null;
  course: string | null;
  department: string | null;
  year_semester: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
  active_issues?: number;
}

export type IssueStatus = 'issued' | 'returned';
export type ComputedStatus = 'issued' | 'overdue' | 'returned';

export interface Issue {
  id: number;
  student_id: number;
  book_id: number;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: IssueStatus;
  fine_amount: number;
  fine_paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  student_name?: string;
  student_code?: string;
  student_email?: string;
  book_title?: string;
  book_code?: string;
  book_author?: string;
  overdue_days?: number;
  current_fine?: number;
  computed_status?: ComputedStatus;
}

export interface DashboardStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  activeIssues: number;
  totalStudents: number;
  totalCategories: number;
  overdueCount: number;
  pendingFine: number;
  returnedCount: number;
  totalTransactions: number;
}

export interface CategoryStat {
  id: number;
  name: string;
  count: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentBooks: Book[];
  recentTransactions: Issue[];
  overdue: Issue[];
  categoryStats: CategoryStat[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  let res: Response;
  try {
    res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error('Network error. Please check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    await supabase.auth.signOut();
    if (window.location.pathname !== '/login') window.location.href = '/login';
    throw new Error('Session expired. Please log in again.');
  }
  if (!res.ok) throw new Error((data && data.error) || 'Something went wrong. Please try again.');
  return data as T;
}

export const api = {
  get: <T,>(path: string) => apiFetch<T>(path),
  post: <T,>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T,>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T,>(path: string, body: unknown) => apiFetch<T>(path, { method: 'DELETE', body: JSON.stringify(body) }),
};
