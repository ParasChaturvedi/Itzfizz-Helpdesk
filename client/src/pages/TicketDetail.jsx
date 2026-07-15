import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Send, Lock, Clock, Building2, UserCog, Flag, Activity, Trash2, Mail,
  CheckCircle2, RotateCcw, Paperclip, Check, CheckCheck, FileText,
  MessageSquareText, Tag as TagIcon, Plus, AlertTriangle, Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../store/auth';
import { Spinner, StatusBadge, PriorityBadge, SlaBadge, Avatar, TagChip, Stars } from '../components/ui';
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
  const [pending, setPending] = useState([]); // uploaded-but-not-yet-sent attachments
  const [uploading, setUploading] = useState(false);
  const [macros, setMacros] = useState([]);
  const [showMacros, setShowMacros] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [csat, setCsat] = useState({ rating: 0, comment: '', busy: false });
  const threadEnd = useRef(null);
  const fileRef = useRef(null);

  const staff = isStaff();
  const admin = isAdmin();

  const load = () =>
    api.get(`/tickets/${id}`).then((r) => setTicket(r.data.ticket));
  const markRead = () => api.post(`/tickets/${id}/read`).catch(() => {});

  useEffect(() => {
    setLoading(true);
    const calls = [load().then(markRead), api.get('/tickets/meta/options').then((r) => setOptions(r.data))];
    if (admin) calls.push(api.get('/users/agents').then((r) => setAgents(r.data.agents)));
    if (isStaff()) {
      calls.push(api.get('/macros').then((r) => setMacros(r.data.macros)).catch(() => {}));
      calls.push(api.get('/tags').then((r) => setAllTags(r.data.tags)).catch(() => {}));
    }
    Promise.all(calls)
      .catch((e) => toast.error(e.response?.data?.message || 'Failed to load ticket'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Live-refresh + read-receipt ping every 10s while the tab is visible.
  useEffect(() => {
    const iv = setInterval(() => {
      if (!document.hidden) load().then(markRead).catch(() => {});
    }, 10000);
    const onFocus = () => { if (!document.hidden) load().then(markRead).catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(iv); window.removeEventListener('focus', onFocus); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (files.some((f) => f.size > 5 * 1024 * 1024)) return toast.error('Each file must be under 5 MB');
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const { data } = await api.post(`/tickets/${id}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPending((p) => [...p, ...data.attachments]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() && pending.length === 0) return;
    setSending(true);
    try {
      const { data } = await api.post(`/tickets/${id}/reply`, {
        body: reply,
        isInternalNote: internal,
        attachments: pending,
      });
      setTicket(data.ticket);
      setReply('');
      setInternal(false);
      setPending([]);
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

  // Insert a canned response into the reply box + apply its one-click actions.
  const applyMacro = async (m) => {
    setShowMacros(false);
    if (m.body) setReply((r) => (r ? `${r}\n\n${m.body}` : m.body));
    const payload = {};
    if (m.actions?.status) payload.status = m.actions.status;
    if (m.actions?.priority) payload.priority = m.actions.priority;
    if (m.actions?.addTags?.length) {
      payload.tags = Array.from(new Set([...(ticket.tags || []), ...m.actions.addTags]));
    }
    if (Object.keys(payload).length) await patch(payload, `Applied “${m.title}”`);
    else toast.success(`Inserted “${m.title}”`);
  };

  const setTags = (tags) => patch({ tags }, 'Tags updated');
  const addTag = (name) => {
    setShowTagMenu(false);
    const t = (name || '').trim();
    if (!t || (ticket.tags || []).includes(t)) return;
    setTags([...(ticket.tags || []), t]);
  };
  const removeTag = (name) => setTags((ticket.tags || []).filter((t) => t !== name));
  const createTag = async (name) => {
    const t = (name || '').trim();
    if (!t) return;
    try {
      const { data } = await api.post('/tags', { name: t, color: '#64748b' });
      setAllTags((prev) => [...prev, data.tag]);
      addTag(t);
    } catch (err) {
      if (err.response?.status === 409) addTag(t);
      else toast.error(err.response?.data?.message || 'Could not create tag');
    }
  };

  const submitCsat = async () => {
    if (!csat.rating) return toast.error('Pick a star rating first');
    setCsat((c) => ({ ...c, busy: true }));
    try {
      const { data } = await api.post(`/tickets/${id}/csat`, { rating: csat.rating, comment: csat.comment });
      setTicket(data.ticket);
      toast.success('Thanks for your feedback!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit rating');
    } finally {
      setCsat((c) => ({ ...c, busy: false }));
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
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            {ticket.escalationLevel > 0 && (
              <span className="chip bg-red-50 text-red-600" title="Auto-escalated by the SLA engine">
                <AlertTriangle className="h-3 w-3" /> Escalated ×{ticket.escalationLevel}
              </span>
            )}
            <SlaBadge ticket={ticket} />
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
          </div>
          {staff &&
            (['resolved', 'closed'].includes(ticket.status) ? (
              <button
                onClick={() => patch({ status: 'open' }, 'Ticket reopened — client notified')}
                className="btn bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" /> Reopen ticket
              </button>
            ) : (
              <button
                onClick={() => patch({ status: 'resolved' }, 'Marked resolved — client notified ✅')}
                className="btn bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark as Resolved
              </button>
            ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Conversation */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-1.5 border-b border-slate-100 pb-3 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Private discussion — only the client, the assigned member{staff ? ' and admins' : ''} can see this.
              <span className="ml-auto flex items-center gap-1 text-emerald-500">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> live
              </span>
            </div>
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

            {pending.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {pending.map((a, i) => (
                  <span key={i} className="chip bg-slate-100 text-slate-600">
                    <Paperclip className="h-3 w-3" /> {a.name}
                    <button type="button" onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                      className="ml-1 text-slate-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
            )}

            <input ref={fileRef} type="file" multiple className="hidden" onChange={onPickFiles} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="btn-ghost !px-3" title="Attach files">
                  <Paperclip className="h-4 w-4" /> {uploading ? 'Uploading…' : 'Attach'}
                </button>
                {staff && macros.length > 0 && (
                  <div className="relative">
                    <button type="button" onClick={() => setShowMacros((s) => !s)}
                      className="btn-ghost !px-3" title="Insert a canned response">
                      <MessageSquareText className="h-4 w-4" /> Canned
                    </button>
                    {showMacros && (
                      <div className="absolute bottom-full left-0 z-20 mb-2 max-h-64 w-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lift">
                        {macros.map((m) => (
                          <button key={m._id} type="button" onClick={() => applyMacro(m)}
                            className="block w-full rounded-lg px-3 py-2 text-left hover:bg-slate-50">
                            <div className="text-sm font-medium text-slate-700">{m.title}</div>
                            {m.body && <div className="truncate text-xs text-slate-400">{m.body}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {staff && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600"
                      checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    Internal note
                  </label>
                )}
              </div>
              <button className="btn-primary" disabled={sending || (!reply.trim() && pending.length === 0)}>
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

                {admin ? (
                  <Control icon={Building2} label="Department">
                    <select className="input" value={ticket.department}
                      onChange={(e) => patch({ department: e.target.value }, 'Department updated')}>
                      {options.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </Control>
                ) : (
                  <Row icon={Building2} label="Department"><span className="text-sm text-slate-700">{ticket.department}</span></Row>
                )}

                {admin ? (() => {
                  // A brand-new ticket sits in 'General' until the admin routes it —
                  // don't group/warn by department until a real one is chosen.
                  const untriaged = ticket.department === 'General';
                  const inDept = untriaged ? [] : agents.filter((a) => a.department === ticket.department);
                  const others = untriaged ? agents : agents.filter((a) => a.department !== ticket.department);
                  const assigneeInList = ticket.assignee && agents.some((a) => a._id === ticket.assignee._id);
                  return (
                    <Control icon={UserCog} label={untriaged ? 'Assignee' : `Assignee — ${ticket.department} team`}>
                      <select className="input" value={ticket.assignee?._id || ''}
                        onChange={(e) => patch({ assignee: e.target.value || null }, 'Assignment updated')}>
                        <option value="">Unassigned</option>
                        {ticket.assignee && !assigneeInList && (
                          <option value={ticket.assignee._id}>{ticket.assignee.name} (inactive)</option>
                        )}
                        {inDept.length > 0 && (
                          <optgroup label={`${ticket.department} team`}>
                            {inDept.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                          </optgroup>
                        )}
                        {others.length > 0 && (
                          <optgroup label={untriaged ? 'All team members' : 'Other departments'}>
                            {others.map((a) => (
                              <option key={a._id} value={a._id}>{a.name}{a.department ? ` · ${a.department}` : ''}</option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      {untriaged ? (
                        <p className="mt-1 text-xs text-slate-400">
                          Set a department above first, then pick the right person from that team.
                        </p>
                      ) : inDept.length === 0 ? (
                        <p className="mt-1 text-xs text-amber-600">
                          No employees in {ticket.department} yet — add them under Team &amp; Clients.
                        </p>
                      ) : null}
                    </Control>
                  );
                })() : (
                  <Row icon={UserCog} label="Assigned to">
                    <span className="text-sm text-slate-700">{ticket.assignee?.name || 'You'}</span>
                  </Row>
                )}

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

          {/* Tags (staff) */}
          {staff && (
            <div className="card p-5 space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <TagIcon className="h-4 w-4" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(ticket.tags || []).length === 0 && <span className="text-xs text-slate-400">No tags yet</span>}
                {(ticket.tags || []).map((t) => {
                  const meta = allTags.find((x) => x.name === t);
                  return <TagChip key={t} name={t} color={meta?.color} onRemove={() => removeTag(t)} />;
                })}
              </div>
              <div className="relative">
                <button type="button" onClick={() => setShowTagMenu((s) => !s)} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Add tag
                </button>
                {showTagMenu && (
                  <TagMenu allTags={allTags} current={ticket.tags || []} onPick={addTag} onCreate={createTag} />
                )}
              </div>
            </div>
          )}

          {/* CSAT — client rates once resolved; staff sees the score */}
          {!staff && ['resolved', 'closed'].includes(ticket.status) && (
            <div className="card p-5 space-y-3">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Star className="h-4 w-4" /> Rate the support
              </h3>
              {ticket.csat?.rating ? (
                <div className="space-y-1">
                  <Stars value={ticket.csat.rating} />
                  {ticket.csat.comment && <p className="text-sm text-slate-500">“{ticket.csat.comment}”</p>}
                  <p className="text-xs text-slate-400">Thanks for your feedback!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Stars value={csat.rating} onChange={(n) => setCsat((c) => ({ ...c, rating: n }))} />
                  <textarea className="input min-h-[70px] resize-y text-sm" placeholder="Anything to add? (optional)"
                    value={csat.comment} onChange={(e) => setCsat((c) => ({ ...c, comment: e.target.value }))} />
                  <button onClick={submitCsat} disabled={csat.busy} className="btn-primary w-full">
                    {csat.busy ? 'Submitting…' : 'Submit rating'}
                  </button>
                </div>
              )}
            </div>
          )}
          {staff && ticket.csat?.rating && (
            <div className="card p-5 space-y-2">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                <Star className="h-4 w-4" /> Customer rating
              </h3>
              <Stars value={ticket.csat.rating} />
              {ticket.csat.comment && <p className="text-sm text-slate-500">“{ticket.csat.comment}”</p>}
            </div>
          )}

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

function Attachment({ a }) {
  const url = `/api/attachments/${a.ref}`;
  const isImg = (a.type || '').startsWith('image/');
  if (isImg) {
    return (
      <a href={url} target="_blank" rel="noreferrer" title={a.name}>
        <img src={url} alt={a.name} className="max-h-44 rounded-lg border border-slate-200 object-cover" />
      </a>
    );
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="chip bg-slate-100 text-slate-600 hover:bg-slate-200">
      <FileText className="h-3.5 w-3.5" /> {a.name}
    </a>
  );
}

function Receipt({ m }) {
  const read = m.readBy || [];
  const delivered = m.deliveredTo || [];
  let Icon = Check, cls = 'text-slate-400', label = 'Sent';
  if (read.length) {
    Icon = CheckCheck; cls = 'text-brand-600';
    const names = read.map((r) => r.user?.name).filter(Boolean);
    label = names.length ? `Seen by ${names.join(', ')}` : 'Seen';
  } else if (delivered.length) {
    Icon = CheckCheck; label = 'Delivered';
  }
  return (
    <div className={`mt-1 flex items-center justify-end gap-1 text-[11px] ${cls}`}>
      <Icon className="h-3.5 w-3.5" /> <span>{label}</span>
    </div>
  );
}

function Message({ m, me }) {
  const mine = String(m.author?._id || m.author) === String(me._id);
  const isSystem = m.authorType === 'system';
  if (isSystem) {
    return <div className="text-center text-xs text-slate-400">{m.body}</div>;
  }
  const atts = m.attachments || [];
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
        {m.body && (
          <div
            className={`inline-block whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-sm leading-relaxed ${
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
        )}
        {atts.length > 0 && (
          <div className={`mt-1.5 flex flex-wrap gap-2 ${mine ? 'justify-end' : ''}`}>
            {atts.map((a, i) => <Attachment key={i} a={a} />)}
          </div>
        )}
        {mine && !m.isInternalNote && <Receipt m={m} />}
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

// Dropdown for picking an existing managed tag or creating a new one inline.
function TagMenu({ allTags, current, onPick, onCreate }) {
  const [q, setQ] = useState('');
  const avail = allTags.filter(
    (t) => !current.includes(t.name) && t.name.toLowerCase().includes(q.toLowerCase())
  );
  const exact = allTags.some((t) => t.name.toLowerCase() === q.trim().toLowerCase());
  return (
    <div className="absolute left-0 top-full z-20 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-2 shadow-lift">
      <input
        autoFocus
        className="input !py-1.5 text-sm"
        placeholder="Find or create a tag…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && q.trim()) {
            e.preventDefault();
            onCreate(q.trim());
            setQ('');
          }
        }}
      />
      <div className="mt-1 max-h-40 overflow-auto">
        {avail.map((t) => (
          <button
            key={t._id}
            type="button"
            onClick={() => onPick(t.name)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-50"
          >
            <span className="h-2 w-2 rounded-full" style={{ background: t.color }} /> {t.name}
          </button>
        ))}
        {q.trim() && !exact && (
          <button
            type="button"
            onClick={() => { onCreate(q.trim()); setQ(''); }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-brand-600 hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" /> Create “{q.trim()}”
          </button>
        )}
        {avail.length === 0 && !q.trim() && (
          <div className="px-2 py-1.5 text-xs text-slate-400">Type to create a tag</div>
        )}
      </div>
    </div>
  );
}
