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
  developer: { label: 'Developer', cls: 'bg-sky-50 text-sky-700' },
  designer: { label: 'Designer', cls: 'bg-pink-50 text-pink-700' },
  content_writer: { label: 'Content Writer', cls: 'bg-amber-50 text-amber-700' },
  hr: { label: 'HR', cls: 'bg-violet-50 text-violet-700' },
  agent: { label: 'Agent', cls: 'bg-emerald-50 text-emerald-700' },
  client: { label: 'Client', cls: 'bg-slate-100 text-slate-600' },
};

export function roleLabel(role) {
  return ROLE_META[role]?.label || role;
}

// SLA badge state for a ticket. Returns null when not applicable.
export function slaState(ticket) {
  if (!ticket?.slaDueAt) return null;
  const resolved = ['resolved', 'closed'].includes(ticket.status);
  const due = new Date(ticket.slaDueAt).getTime();
  const now = Date.now();
  if (resolved) {
    const met = ticket.resolvedAt ? new Date(ticket.resolvedAt).getTime() <= due : true;
    return met
      ? { label: 'SLA met', cls: 'bg-emerald-50 text-emerald-700', overdue: false }
      : { label: 'SLA missed', cls: 'bg-red-50 text-red-600', overdue: true };
  }
  const diffMs = due - now;
  if (diffMs < 0) return { label: 'Overdue', cls: 'bg-red-50 text-red-600', overdue: true };
  const hrs = Math.round(diffMs / 3600000);
  const label = hrs >= 24 ? `Due in ${Math.round(hrs / 24)}d` : `Due in ${Math.max(1, hrs)}h`;
  const soon = diffMs < 4 * 3600000;
  return { label, cls: soon ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600', overdue: false };
}

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
