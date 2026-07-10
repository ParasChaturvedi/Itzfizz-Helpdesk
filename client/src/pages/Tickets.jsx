import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, Filter, Ticket as TicketIcon, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../store/auth';
import { Spinner, StatusBadge, PriorityBadge, SlaBadge, Avatar, EmptyState } from '../components/ui';
import { timeAgo, STATUS_META } from '../lib/ui';

const STATUS_TABS = ['all', 'open', 'in_progress', 'on_hold', 'resolved', 'closed'];

export default function Tickets() {
  const { isStaff } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [mine, setMine] = useState(false);

  const load = () => {
    setLoading(true);
    const params = {};
    if (tab !== 'all') params.status = tab;
    if (priority) params.priority = priority;
    if (mine) params.mine = 'true';
    if (q) params.q = q;
    api.get('/tickets', { params })
      .then((r) => setTickets(r.data.tickets))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const id = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, priority, mine, q]);

  const counts = useMemo(() => tickets.length, [tickets]);

  const exportCsv = async () => {
    try {
      const params = {};
      if (tab !== 'all') params.status = tab;
      if (priority) params.priority = priority;
      const res = await api.get('/tickets/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tickets-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Tickets</h1>
          <p className="text-sm text-slate-400">{counts} shown</p>
        </div>
        <div className="flex items-center gap-2">
          {isStaff() && (
            <button onClick={exportCsv} className="btn-ghost"><Download className="h-4 w-4" /> Export CSV</button>
          )}
          <Link to="/tickets/new" className="btn-primary"><Plus className="h-4 w-4" /> New Ticket</Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Search subject, reference or email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select className="input !w-auto pl-8" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">All priority</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          {isStaff() && (
            <button
              onClick={() => setMine((m) => !m)}
              className={`btn ${mine ? 'bg-brand-600 text-white' : 'btn-ghost'}`}
            >
              Assigned to me
            </button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              tab === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t === 'all' ? 'All' : STATUS_META[t].label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner />
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No tickets here"
          subtitle="Nothing matches these filters yet. New emails and web requests will show up here."
          action={<Link to="/tickets/new" className="btn-primary mt-2"><Plus className="h-4 w-4" /> Create ticket</Link>}
        />
      ) : (
        <div className="card divide-y divide-slate-100 overflow-hidden">
          {tickets.map((t) => (
            <Link key={t._id} to={`/tickets/${t._id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
              <Avatar name={t.requester?.name || t.requesterName} color={t.requester?.avatarColor} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-brand-600">{t.reference}</span>
                  {t.source === 'email' && <span className="chip bg-slate-100 text-slate-500">✉ email</span>}
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-400">{t.department}</span>
                </div>
                <div className="truncate font-medium text-slate-700">{t.subject}</div>
                <div className="text-xs text-slate-400">
                  {t.requester?.name || t.requesterName} · updated {timeAgo(t.lastReplyAt)}
                </div>
              </div>
              <div className="hidden shrink-0 items-center gap-2 md:flex">
                <SlaBadge ticket={t} />
                {t.assignee ? (
                  <span title={`Assigned to ${t.assignee.name}`}>
                    <Avatar name={t.assignee.name} color={t.assignee.avatarColor} size={28} />
                  </span>
                ) : (
                  <span className="chip bg-red-50 text-red-500">Unassigned</span>
                )}
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
