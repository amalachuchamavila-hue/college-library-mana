import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Inbox, Loader2, Search, X, type LucideIcon } from 'lucide-react';
import { cn, initials } from '../lib/utils';
import type { ComputedStatus } from '../lib/api';

/* ---------------- Button ---------------- */
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: LucideIcon;
}

const BTN_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-400',
  secondary: 'bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 focus:ring-blue-500 disabled:opacity-60',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500 disabled:bg-red-400',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-60',
  outline: 'border border-blue-600 text-blue-700 hover:bg-blue-50 focus:ring-blue-500 disabled:opacity-60',
};
const BTN_SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-lg gap-2',
  lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
};

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={cn('inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 active:scale-[0.98]', BTN_VARIANTS[variant], BTN_SIZES[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

/* ---------------- StatCard ---------------- */
type Accent = 'blue' | 'cyan' | 'violet' | 'amber' | 'red' | 'emerald';
const ACCENTS: Record<Accent, { tile: string }> = {
  blue: { tile: 'bg-blue-50 text-blue-600' },
  cyan: { tile: 'bg-cyan-50 text-cyan-600' },
  violet: { tile: 'bg-violet-50 text-violet-600' },
  amber: { tile: 'bg-amber-50 text-amber-600' },
  red: { tile: 'bg-red-50 text-red-600' },
  emerald: { tile: 'bg-emerald-50 text-emerald-600' },
};

export function StatCard({ label, value, sub, icon: Icon, accent = 'blue', delay = 0 }: { label: string; value: string; sub?: string; icon: LucideIcon; accent?: Accent; delay?: number }) {
  const a = ACCENTS[accent];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 sm:text-[13px]">{label}</p>
          <p className="mt-1 truncate text-2xl font-extrabold text-slate-900 sm:text-3xl">{value}</p>
          {sub && <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{sub}</p>}
        </div>
        <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12', a.tile)}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </div>
    </motion.div>
  );
}

/* ---------------- Field / Inputs ---------------- */
export function Field({ label, required, error, hint, children, className }: { label?: string; required?: boolean; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

const INPUT_CLS = 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-slate-100 disabled:text-slate-500';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> { label?: string; error?: string; }
export function Input({ label, error, required, className, ...rest }: InputProps) {
  return (
    <Field label={label} required={required} error={error} className={className}>
      <input
        className={cn(INPUT_CLS, error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200')}
        {...rest}
      />
    </Field>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> { label?: string; error?: string; }
export function Select({ label, error, required, className, children, ...rest }: SelectProps) {
  return (
    <Field label={label} required={required} error={error} className={className}>
      <select
        className={cn(INPUT_CLS, error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200')}
        {...rest}
      >
        {children}
      </select>
    </Field>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> { label?: string; error?: string; }
export function Textarea({ label, error, required, className, ...rest }: TextareaProps) {
  return (
    <Field label={label} required={required} error={error} className={className}>
      <textarea
        className={cn(INPUT_CLS, 'min-h-[90px] resize-y', error ? 'border-red-400 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200')}
        {...rest}
      />
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search...', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Clear search">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ---------------- Badge ---------------- */
type BadgeTone = 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'violet' | 'cyan';
const BADGE: Record<BadgeTone, string> = {
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  cyan: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
};
export function Badge({ tone = 'slate', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', BADGE[tone], className)}>
      {children}
    </span>
  );
}

export function IssueStatusBadge({ status }: { status?: ComputedStatus }) {
  if (status === 'overdue') return <Badge tone="red">Overdue</Badge>;
  if (status === 'returned') return <Badge tone="emerald">Returned</Badge>;
  return <Badge tone="blue">Issued</Badge>;
}

/* ---------------- Modal ---------------- */
export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'lg' }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; maxWidth?: 'md' | 'lg' | 'xl' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const widths = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className={cn('relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl', widths[maxWidth])}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- ConfirmDialog ---------------- */
export function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', onConfirm, onCancel, loading = false, danger = true }: { open: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; onCancel: () => void; loading?: boolean; danger?: boolean }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} maxWidth="md" footer={<>
      <Button variant="secondary" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
      <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
    </>}>
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}

/* ---------------- Empty / Loading ---------------- */
export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500">
        <Icon className="h-7 w-7" />
      </span>
      <h4 className="mt-4 text-base font-bold text-slate-900">{title}</h4>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageLoader({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <p className="text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse p-4">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 border-b border-slate-100 py-3 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="h-4 flex-1 rounded bg-slate-200" style={{ opacity: 1 - c * 0.12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="h-5 w-2/3 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-1/2 rounded bg-slate-100" />
          <div className="mt-2 h-4 w-1/3 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

/* ---------------- Pagination ---------------- */
export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: { page: number; totalPages: number; totalItems: number; pageSize: number; onPageChange: (p: number) => void }) {
  if (totalItems === 0 || totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const pages: Array<number | '...'> = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== '...') pages.push('...');
  }
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:px-5">
      <p className="text-xs text-slate-500 sm:text-sm">Showing <span className="font-semibold text-slate-700">{start}-{end}</span> of <span className="font-semibold text-slate-700">{totalItems}</span></p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Prev</span>
        </button>
        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((p, i) => p === '...' ? (
            <span key={`e${i}`} className="px-1.5 text-sm text-slate-400">...</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p)} className={cn('h-8 min-w-8 rounded-lg px-2 text-sm font-semibold transition', p === page ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>{p}</button>
          ))}
        </div>
        <span className="px-2 text-sm font-medium text-slate-600 sm:hidden">{page} / {totalPages}</span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next page">
          <span className="hidden sm:inline">Next</span><ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Misc ---------------- */
export function Avatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white', className)}>
      {initials(name || 'A')}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="p-8 text-center">
      <p className="text-sm font-semibold text-red-600">{message}</p>
      <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">Try again</Button>
    </Card>
  );
}
