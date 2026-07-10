import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Lock, Clock, Building2, UserCog, Flag, Activity, Trash2, Mail,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../store/auth';
import { Spinner, StatusBadge, PriorityBadge, Avatar } from '../components/ui';
import { timeAgo, fullDate } from '../lib/ui';

export default function TicketDetail() {
  const { id } = useParams();
  const { user, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState({ statuses: [], priorities: [], departments: [] });
  const [agents, setAgents] = useState([]);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const threadEnd = useRef(null);

  const staff = isStaff();

  const load = () =>
    api.get(`/tickets/${id}`).then((r) => setTicket(r.data.ticket));

  useEffect(() => {
    setLoading(true);
    const calls = [load(), api.get('/tickets/meta/options').then((r) => setOptions(r.data))];
    if (staff) calls.push(api.get('/users/agents').then((r) => setAgents(r.data.agents)));
    Promise.all(calls)
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load ticket'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/tickets/${id}/reply`, {
        body: reply,
        isInternalNote: internal,
      });
      setTicket(data.ticket);
      setReply('');
      setInternal(false);
      toast.success(internal ? 'Internal note added' : 'Reply sent');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const patch = async (payload, label) => {
    try {
      const { data } = await api.patch(`/tickets/${id}`, payload);
      setTicket(data.ticket);
      if (label) toast.success(label);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    }
  };

  const removeTicket = async () => {
    if (!confirm('Delete this ticket permanently?')) return;
    await api.delete(`/tickets/${id}`);
    toast.success('Ticket deleted');
    navigate('/tickets');
  };

  if (loading) return <Spinner />;
  if (!ticket) return null;

  return (
    <div className="space-y-6">
      <Link to="/tickets" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Back to tickets
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-brand-600">{ticket.reference}</span>
            {ticket.source === 'email' && (
              <span className="chip bg-slate-100 text-slate-500"><Mail className="h-3 w-3" /> via email</span>
            )}
          </div>
          <h1 className="mt-1 text-xl font-extrabold text-slate-800 lg:text-2xl">{ticket.subject}</h1>
          <div className="mt-1 text-sm text-slate-400">
            Opened by {ticket.requester?.name || ticket.requesterName} · {timeAgo(ticket.createdAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 sm:p-5">
            <div className="space-y-5">
              {ticket.messages.map((m) => (
                <Message key={m._id} m={m} me={user} />
              ))}
              <div ref={threadEnd} />
            </div>
          </div>

          {/* Reply box */}
          <form onSubmit={sendReply} className={`card p-4 ${internal ? 'ring-2 ring-amber-200' : ''}`}>
            {internal && (
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                <Lock className="h-3.5 w-3.5" /> Internal note — not visible to the client
              </div>
            )}
            <textarea
              className="input min-h-[110px] resize-y"
              placeholder={internal ? 'Write an internal note for your team…' : 'Write a reply…'}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
            />
            <div className="mt-3 flex items-center justify-between">
              {staff ? (
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600"
                    checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                  Internal note
                </label>
              ) : <span />}
              <button className="btn-primary" disabled={sending || !reply.trim()}>
                <Send className="h-4 w-4" /> {sending ? 'Sending…' : internal ? 'Add note' : 'Send reply'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-700">Details</h3>

            <Row icon={UserCog} label="Requester">
              <div className="flex items-center gap-2">
                <Avatar name={ticket.requester?.name || ticket.requesterName} color={ticket.requester?.avatarColor} size={26} />
                <div className="text-sm">
                  <div className="font-medium text-slate-700">{ticket.requester?.name || ticket.requesterName}</div>
                  <div className="text-xs text-slate-400">{ticket.requesterEmail}</div>
                </div>
              </div>
            </Row>

            {staff ? (
              <>
                <Control icon={Flag} label="Status">
                  <select className="input" value={ticket.status}
                    onChange={(e) => patch({ status: e.target.value }, 'Status updated')}>
                    {options.statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </Control>

                <Control icon={Flag} label="Priority">
                  <select className="input" value={ticket.priority}
                    onChange={(e) => patch({ priority: e.target.value }, 'Priority updated')}>
                    {options.priorities.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </Control>

                <Control icon={Building2} label="Department">
                  <select className="input" value={ticket.department}
                    onChange={(e) => patch({ department: e.target.value }, 'Department updated')}>
                    {options.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Control>

                <Control icon={UserCog} label="Assignee">
                  <select className="input" value={ticket.assignee?._id || ''}
                    onChange={(e) => patch({ assignee: e.target.value || null }, 'Assignment updated')}>
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a._id} value={a._id}>{a.name}{a.department ? ` · ${a.department}` : ''}</option>
                    ))}
                  </select>
                </Control>

                <Control icon={Clock} label="Estimated time">
                  <input className="input" defaultValue={ticket.estimatedTime}
                    placeholder="e.g. 2-3 days"
                    onBlur={(e) => {
                      if (e.target.value !== ticket.estimatedTime) patch({ estimatedTime: e.target.value }, 'Estimate saved');
                    }} />
                </Control>
              </>
            ) : (
              <>
                <Row icon={Building2} label="Department"><span className="text-sm text-slate-700">{ticket.department}</span></Row>
                {ticket.assignee && (
                  <Row icon={UserCog} label="Handled by">
                    <span className="text-sm text-slate-700">{ticket.assignee.name}</span>
                  </Row>
                )}
                {ticket.estimatedTime && (
                  <Row icon={Clock} label="Estimated time"><span className="text-sm text-slate-700">{ticket.estimatedTime}</span></Row>
                )}
              </>
            )}
          </div>

          {/* Activity (staff only) */}
          {staff && ticket.activity?.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Activity className="h-4 w-4" /> Activity
              </h3>
              <ul className="space-y-3">
                {[...ticket.activity].reverse().slice(0, 12).map((a) => (
                  <li key={a._id} className="flex gap-2.5 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span className="text-slate-500">
                      <span className="font-medium text-slate-700">{a.actorName || 'System'}</span> {a.action}
                      <span className="block text-xs text-slate-400">{timeAgo(a.createdAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isAdmin() && (
            <button onClick={removeTicket} className="btn-danger w-full">
              <Trash2 className="h-4 w-4" /> Delete ticket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Message({ m, me }) {
  const mine = String(m.author?._id || m.author) === String(me._id);
  const isSystem = m.authorType === 'system';
  if (isSystem) {
    return <div className="text-center text-xs text-slate-400">{m.body}</div>;
  }
  return (
    <div className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
      <Avatar name={m.author?.name || m.authorName} color={m.author?.avatarColor} size={36} />
      <div className={`max-w-[85%] ${mine ? 'items-end text-right' : ''}`}>
        <div className={`mb-1 flex items-center gap-2 text-xs text-slate-400 ${mine ? 'justify-end' : ''}`}>
          <span className="font-semibold text-slate-600">{m.author?.name || m.authorName}</span>
          {m.authorType === 'client' && <span className="chip bg-slate-100 text-slate-500">client</span>}
          {m.via === 'email' && <span title="Received by email">✉</span>}
          <span>{fullDate(m.createdAt)}</span>
        </div>
        <div
          className={`whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            m.isInternalNote
              ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200'
              : mine
              ? 'bg-brand-600 text-white'
              : 'bg-slate-100 text-slate-700'
          }`}
        >
          {m.isInternalNote && <span className="mb-1 block text-xs font-semibold opacity-70">🔒 Internal note</span>}
          {m.body}
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      {children}
    </div>
  );
}

function Control({ icon: Icon, label, children }) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </label>
      {children}
    </div>
  );
}
