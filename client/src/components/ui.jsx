import { STATUS_META, PRIORITY_META, ROLE_META, initials, slaState } from '../lib/ui';
import { Loader2, Inbox, Timer, Star, X } from 'lucide-react';

// Convert a hex colour to a soft translucent background for tag chips.
function tint(hex) {
  const h = (hex || '#64748b').replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16) || 100;
  const g = parseInt(n.slice(2, 4), 16) || 116;
  const b = parseInt(n.slice(4, 6), 16) || 139;
  return { color: `rgb(${r},${g},${b})`, background: `rgba(${r},${g},${b},0.12)` };
}

export function TagChip({ name, color, onRemove }) {
  const s = tint(color);
  return (
    <span className="chip" style={s}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
      {name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 opacity-60 hover:opacity-100" aria-label={`Remove ${name}`}>
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

export function Stars({ value = 0, onChange, size = 20 }) {
  const readOnly = !onChange;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange && onChange(n)}
          className={readOnly ? 'cursor-default' : 'cursor-pointer transition hover:scale-110'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            style={{ width: size, height: size }}
            className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
          />
        </button>
      ))}
    </div>
  );
}

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

export function SlaBadge({ ticket }) {
  const s = slaState(ticket);
  if (!s) return null;
  return (
    <span className={`chip ${s.cls}`} title="Resolution SLA">
      <Timer className="h-3 w-3" />
      {s.label}
    </span>
  );
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
