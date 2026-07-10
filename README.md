# 🎧 Itzfizz Helpdesk

A modern, self-hosted **helpdesk / ticketing system** built on the **MERN** stack.
Email-to-Ticket automation, Role-Based Access Control, task assignment, internal
notes and client status updates — all yours, all free to run.

> React + Vite + Tailwind · Express + Mongoose · MongoDB Atlas · JWT auth ·
> SendGrid email · deploys to Vercel as one project.

---

## ✨ Features

| Area | What you get |
| --- | --- |
| **Email → Ticket** | Emails become tickets automatically via SendGrid Inbound Parse (webhook) or an optional IMAP poller. Replies thread back into the same ticket by its `TKT-000123` reference. |
| **RBAC & roles** | Roles: **admin**, **developer**, **designer**, **content_writer**, **hr**, **agent**, **client** — enforced on every API route. Admin provisions every account (sets a **username + password**); users can change their password later. Clients only see their own tickets; internal notes are hidden from them. |
| **Assignment + notifications** | Assign any ticket to a team member; on assignment they get an **email + WhatsApp** alert. Set department, priority, status and estimated time. |
| **SLA timers** | Each ticket gets a resolution deadline based on priority (configurable per priority in Settings). Tickets show **Due in Xh / Overdue / SLA met** badges. |
| **CSV export** | One-click export of the current (filtered) ticket list to CSV. |
| **Branding** | Admin uploads a **logo**, sets the brand name and accent colour from the Settings page (stored in the DB — no external file storage). |
| **Client updates** | Auto-responder on new tickets + email notifications on replies and status changes. Clients track everything in their own portal. |
| **Auth** | JWT (bearer + httpOnly cookie), bcrypt-hashed passwords, rate-limited login. Log in with **email or username**. The very first account to register becomes the admin. |
| **Modern UI** | Clean, responsive Tailwind interface with dashboard stats, filters, search, conversation threads and an activity log. |

---

## 🧱 Architecture

```
itzfizz-helpdesk/
├── api/index.js         # Vercel serverless entry → wraps the Express app
├── server/              # Express + Mongoose API
│   ├── app.js           # app (no listen) — imported by api + local index
│   ├── index.js         # local dev server (app.listen)
│   ├── models/          # User, Ticket, Counter
│   ├── controllers/     # auth, users, tickets, webhook (inbound email)
│   ├── routes/          # /api/auth /api/users /api/tickets /api/webhooks
│   ├── middleware/      # protect (JWT) + authorize (RBAC) + errors
│   ├── utils/           # email (SendGrid/SMTP) + templates, JWT
│   └── scripts/         # seed.js, imapWorker.js (optional VPS poller)
├── client/              # React (Vite) + Tailwind SPA
└── vercel.json          # build + routing for a single Vercel project
```

On Vercel, `/api/*` is served by the serverless function and everything else is
the static React build. Mongoose uses a cached connection so it survives the
serverless cold/warm lifecycle.

---

## 🚀 Local development

**Prerequisites:** Node 18+, a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) cluster.

```bash
# 1. install
npm install
npm install --prefix client

# 2. configure
cp .env.example .env       # fill in MONGODB_URI + JWT_SECRET (min needed)

# 3. seed an admin + demo data (optional)
npm run seed               # → admin@itzfizz.local / admin123

# 4. run API + client together
npm run dev
```

- API → http://localhost:5000  (health: `/api/health`)
- App → http://localhost:5173

The very first account you register (if you skip the seed) automatically becomes
the **admin**.

---

## 📨 Email-to-Ticket setup

You have two free options. Pick one.

### Option A — SendGrid Inbound Parse (recommended, works on Vercel)

1. Create a free [SendGrid](https://signup.sendgrid.com/) account (100 emails/day free).
2. **Outbound:** create an API key → set `SENDGRID_API_KEY` and `EMAIL_FROM`
   (verify your sender/domain in SendGrid first).
3. **Inbound:** SendGrid → *Settings → Inbound Parse → Add Host & URL*.
   - Add an MX record on a subdomain, e.g. `support.yourdomain.com` → `mx.sendgrid.net`.
   - Destination URL:
     `https://your-app.vercel.app/api/webhooks/inbound-email?token=YOUR_INBOUND_WEBHOOK_TOKEN`
4. Now anyone emailing `anything@support.yourdomain.com` creates/updates a ticket.

### Option B — IMAP poller (any mailbox, needs an always-on box)

Good for a VPS. Polls an inbox (e.g. a Gmail with an app password) and turns
unseen mail into tickets — no domain/MX changes needed.

```bash
# set IMAP_HOST / IMAP_USER / IMAP_PASS in .env
npm run imap
```

Keep it running with pm2/systemd on your server.

> No email provider configured? The app still works fully — outbound emails are
> just logged to the console instead of sent, so nothing breaks in development.

---

## ☁️ Deploy to Vercel (free)

1. Push this repo to GitHub (see below).
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
   Vercel auto-detects `vercel.json`; no framework preset changes needed.
3. Add **Environment Variables** (from `.env.example`): at minimum
   `MONGODB_URI`, `JWT_SECRET`, `APP_URL` (your Vercel URL), and your email vars.
4. Deploy. Your API lives at `https://your-app.vercel.app/api/*`.
5. First visit → register → you're the admin. Then add agents under **Team & Clients**.

> **MongoDB Atlas:** under *Network Access* allow `0.0.0.0/0` so Vercel's
> serverless IPs can connect.

### Or via CLI

```bash
npm i -g vercel
vercel            # link + deploy preview
vercel --prod     # production
```

---

## 🔐 Roles at a glance

**Staff** = admin, developer, designer, content_writer, hr, agent. **Client** = end user.

| Capability | admin | staff (dev/designer/writer/hr/agent) | client |
| --- | :--: | :--: | :--: |
| Create ticket / reply | ✅ | ✅ | ✅ |
| See all tickets | ✅ | ✅ | own only |
| Assign / change status / estimate | ✅ | ✅ | ❌ |
| Internal notes | ✅ | ✅ | ❌ (hidden) |
| Export CSV | ✅ | ✅ | ❌ |
| Provision users / set roles | ✅ | ❌ | ❌ |
| Branding & SLA settings | ✅ | ❌ | ❌ |
| Delete tickets | ✅ | ❌ | ❌ |

The admin creates accounts under **Team & Clients** (name, email, optional
username, generated password, role, department, WhatsApp number). New users are
flagged to change their password on first login.

---

## 📲 WhatsApp notifications (free options)

Assignees get a WhatsApp alert when a ticket is assigned. Pick one:

- **CallMeBot (fully free):** each teammate messages the CallMeBot number once to
  get a personal API key, then saves the key + phone under **Profile**. No server
  config needed. Guide: https://www.callmebot.com/blog/free-api-whatsapp-messages/
- **Meta WhatsApp Cloud API:** set `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` env vars
  (free tier ~1,000 conversations/month). Sends to each user's saved phone.

If neither is set, alerts are logged to the console — nothing breaks.

---

## 🧪 What's verified

Two end-to-end suites pass against an in-memory MongoDB (34 assertions total):
admin bootstrap, full RBAC (incl. non-admin staff roles), username login,
admin-provisioned accounts + forced password change, ticket references,
assignment with email/WhatsApp alerts, SLA computation + recompute, resolvedAt,
internal-note scoping, email-to-ticket + reply threading, CSV export, and
branding/logo settings. The client builds cleanly and the login, dashboard,
tickets (with SLA badges), settings and user-management screens render against
live data.

---

## 📄 License

MIT — do whatever you like.
