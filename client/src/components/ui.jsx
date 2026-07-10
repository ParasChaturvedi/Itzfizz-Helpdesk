import { STATUS_META, PRIORITY_META, ROLE_META, initials } from '../lib/ui';
import { Loader2, Inbox } from 'lucide-react';

export function Avatar({ name = '?', color = '#6366f1', size = 36 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name) || '?'}
    </span>
  );
}

export function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.open;
  return (
    <span className={`chip ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const m = PRIORITY_META[priority] || PRIORITY_META.medium;
  return (
    <span className={`chip ${m.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

export function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.client;
  return <span className={`chip ${m.cls}`}>{m.label}</span>;
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-3 text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, subtitle, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/60 p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      {subtitle && <p className="max-w-sm text-sm text-slate-400">{subtitle}</p>}
      {action}
    </div>
  );
}
