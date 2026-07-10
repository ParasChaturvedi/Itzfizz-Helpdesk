/**
 * OPTIONAL email-to-ticket poller for an always-on box (e.g. your VPS).
 * Use this instead of the SendGrid Inbound Parse webhook when you just want to
 * poll a normal mailbox (Gmail app password, etc.) — no domain MX changes needed.
 *
 * It fetches UNSEEN messages, forwards each to the same webhook handler your
 * Vercel app uses, marks them seen, and repeats.
 *
 * Run:  npm run imap     (set IMAP_* vars in .env first)
 */
require('dotenv').config();
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const connectDB = require('../config/db');
const { inboundEmail } = require('../controllers/webhookController');

const POLL = Number(process.env.IMAP_POLL_SECONDS || 60) * 1000;

async function processMailbox() {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: Number(process.env.IMAP_PORT || 993),
    secure: true,
    auth: { user: process.env.IMAP_USER, pass: process.env.IMAP_PASS },
    logger: false,
  });

  await client.connect();
  const lock = await client.getMailboxLock('INBOX');
  try {
    const unseen = await client.search({ seen: false });
    if (unseen && unseen.length) {
      console.log(`[imap] ${unseen.length} new message(s)`);
      for (const uid of unseen) {
        const msg = await client.fetchOne(uid, { source: true });
        const parsed = await simpleParser(msg.source);

        // Reuse the webhook controller with a fake req/res.
        const req = {
          query: { token: process.env.INBOUND_WEBHOOK_TOKEN },
          body: {
            from: parsed.from?.text || '',
            subject: parsed.subject || '',
            text: parsed.text || '',
            html: parsed.html || '',
          },
        };
        const res = {
          status: () => res,
          json: (data) => console.log('[imap] →', data),
        };
        try {
          await inboundEmail(req, res);
          await client.messageFlagsAdd(uid, ['\\Seen']);
        } catch (e) {
          console.error('[imap] failed to process message:', e.message);
        }
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
}

async function loop() {
  await connectDB();
  console.log(`📥 Itzfizz Helpdesk IMAP worker started (every ${POLL / 1000}s)`);
  const tick = async () => {
    try {
      await processMailbox();
    } catch (e) {
      console.error('[imap] poll error:', e.message);
    } finally {
      setTimeout(tick, POLL);
    }
  };
  tick();
}

loop();
