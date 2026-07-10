import { formatDistanceToNow, format } from 'date-fns';

export const STATUS_META = {
  open: { label: 'Open', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200', dot: 'bg-blue-500' },
  in_progress: { label: 'In Progress', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  on_hold: { label: 'On Hold', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200', dot: 'bg-slate-400' },
  resolved: { label: 'Resolved', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200', dot: 'bg-emerald-500' },
  closed: { label: 'Closed', cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200', dot: 'bg-slate-400' },
};

export const PRIORITY_META = {
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  medium: { label: 'Medium', cls: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
  high: { label: 'High', cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  urgent: { label: 'Urgent', cls: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
};

export const ROLE_META = {
  admin: { label: 'Admin', cls: 'bg-brand-50 text-brand-700' },
  agent: { label: 'Agent', cls: 'bg-emerald-50 text-emerald-700' },
  client: { label: 'Client', cls: 'bg-slate-100 text-slate-600' },
};

export function timeAgo(date) {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

export function fullDate(date) {
  if (!date) return '';
  try {
    return format(new Date(date), 'dd MMM yyyy, HH:mm');
  } catch {
    return '';
  }
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');
}
