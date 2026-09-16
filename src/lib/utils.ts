export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export const FINE_PER_DAY = 5;
export const DEFAULT_LOAN_DAYS = 14;

export function getLoanDays(): number {
  const v = Number(localStorage.getItem('lib_loan_days') || DEFAULT_LOAN_DAYS);
  return Number.isInteger(v) && v > 0 && v <= 365 ? v : DEFAULT_LOAN_DAYS;
}

export function getLibraryName(): string {
  return localStorage.getItem('lib_library_name') || 'College Library';
}

export function dateOnly(v: string | null | undefined): string {
  return String(v || '').slice(0, 10);
}

export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateOnly(dateISO) + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function diffDays(fromISO: string, toISO: string): number {
  const a = new Date(dateOnly(fromISO) + 'T00:00:00');
  const b = new Date(dateOnly(toISO) + 'T00:00:00');
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function calcFine(dueISO: string, endISO?: string | null): { days: number; fine: number } {
  const end = dateOnly(endISO) || todayISO();
  const days = Math.max(0, diffDays(dateOnly(dueISO), end));
  return { days, fine: days * FINE_PER_DAY };
}

export function formatINR(n: number | null | undefined): string {
  return '\u20B9' + Number(n || 0).toLocaleString('en-IN');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '\u2014';
  const d = new Date(dateOnly(iso) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return '';
  const mins = Math.floor((Date.now() - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

export function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export function isPhone(v: string): boolean {
  if (!v.trim()) return true;
  const d = v.replace(/\D/g, '');
  return d.length >= 7 && d.length <= 15;
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
