import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket as TicketIcon, Inbox, UserCheck, CheckCircle2, AlertTriangle, ArrowRight,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../store/auth';
import { Spinner, StatusBadge, PriorityBadge, Avatar } from '../components/ui';
import { timeAgo } from '../lib/ui';

function StatCard({ icon: Icon, label, value, tint }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-slate-800">{value ?? 0}</div>
        <div className="text-sm text-slate-400">{label}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isStaff } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/tickets/stats'), api.get('/tickets')])
      .then(([s, t]) => {
        setStats(s.data);
        setRecent(t.data.tickets.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const s = stats.byStatus || {};
  const open = (s.open || 0) + (s.in_progress || 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-400">
          {isStaff() ? 'Overview of your support queue.' : 'Track all your requests in one place.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Inbox} label="Open + In progress" value={open} tint="bg-blue-50 text-blue-600" />
        <StatCard icon={TicketIcon} label="Total tickets" value={stats.total} tint="bg-brand-50 text-brand-600" />
        {isStaff() ? (
          <>
            <StatCard icon={UserCheck} label="Assigned to me" value={stats.mine} tint="bg-amber-50 text-amber-600" />
            <StatCard icon={AlertTriangle} label="Unassigned" value={stats.unassigned} tint="bg-red-50 text-red-600" />
          </>
        ) : (
          <>
            <StatCard icon={CheckCircle2} label="Resolved" value={s.resolved || 0} tint="bg-emerald-50 text-emerald-600" />
            <StatCard icon={CheckCircle2} label="Closed" value={s.closed || 0} tint="bg-slate-100 text-slate-500" />
          </>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-bold text-slate-800">Recent tickets</h2>
          <Link to="/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No tickets yet.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((t) => (
              <li key={t._id}>
                <Link to={`/tickets/${t._id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <Avatar name={t.requester?.name || t.requesterName} color={t.requester?.avatarColor} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-brand-600">{t.reference}</span>
                      <span className="text-xs text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{timeAgo(t.lastReplyAt)}</span>
                    </div>
                    <div className="truncate font-medium text-slate-700">{t.subject}</div>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
